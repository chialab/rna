import { isUrl } from '@chialab/node-resolve';
import { MagicString, getSpanLocation, parse, walk } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Detect first level identifier for esbuild file loader imports.
 * File could be previously bundled using esbuild, so the first argument of a new URL(something, import.meta.url)
 * is not a literal anymore but an identifier.
 * Here, we are looking for its computed value.
 * @param {string} id The name of the identifier.
 * @param {import('@chialab/estransform').Program} program The ast program.
 * @return {import('@chialab/estransform').StringLiteral|import('@chialab/estransform').Identifier} The init ast node.
 */
export function findIdentifierValue(id, program) {
    const identifier = program.body
        .filter(
            /**
             * @param {*} child
             */
            (child) => child.type === 'VariableDeclaration'
        )
        .reduce(
            /**
             * @param {*[]} acc
             * @param {*} child
             */
            (acc, child) => [...acc, ...child.declarations], []
        )
        .filter(
            /**
             * @param {*} child
             */
            (child) => child.type === 'VariableDeclarator'
        )
        .find(
            /**
             * @param {*} child
             */
            (child) => child.id && child.id.type === 'Identifier' && child.id.name === id
        );

    return identifier.init;
}

/**
 * @param {import('@chialab/estransform').NewExpression|import('@chialab/estransform').MemberExpression} node The ast node.
 * @param {import('@chialab/estransform').Program} ast The ast program.
 * @return The path value.
 */
export function getMetaUrl(node, ast) {
    const callExp = /** @type {import('@chialab/estransform').CallExpression} */ (node.type === 'MemberExpression' ? node.object : node);
    if (callExp.type !== 'CallExpression' && !callExp.callee || callExp.callee.type !== 'Identifier' || callExp.callee.value !== 'URL') {
        return;
    }

    if (callExp.arguments.length !== 2) {
        return;
    }

    const firstArgExp = callExp.arguments[0] && callExp.arguments[0].expression;
    const arg1 = firstArgExp.type === 'Identifier' && findIdentifierValue(firstArgExp.value, ast) || firstArgExp;
    const arg2 = callExp.arguments[1] && callExp.arguments[1].expression;

    if (arg1.type !== 'StringLiteral' ||
        arg2.type !== 'MemberExpression') {
        return;
    }

    if (arg2.object.type !== 'MetaProperty' ||
        arg2.property.type !== 'Identifier' ||
        arg2.property.value !== 'url') {
        return;
    }

    return arg1.value;
}

/**
 * @param {string} entryPoint
 * @param {string} [specifier]
 */
function createImportStatement(entryPoint, specifier) {
    const identifier = `_${(specifier || entryPoint).split('?')[0].replace(/[^a-zA-Z0-9]/g, '_')}`;

    return {
        identifier,
        statement: `import ${identifier} from '${entryPoint}';`,
    };
}

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        async setup(build) {
            const { sourcesContent } = build.initialOptions;
            const { onTransform, resolve, getBaseUrl, emitFileOrChunk, getChunkOptions, rootDir } = useRna(build);

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                if (!args.code.includes('import.meta.url') ||
                    !args.code.includes('URL(')) {
                    return;
                }

                /**
                 * @type {MagicString|undefined}
                 */
                let magicCode;

                /**
                 * @type {{ [key: string]: string }}
                 */
                const ids = {};

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const ast = await parse(args.code);
                walk(ast, {
                    /**
                     * @param {import('@chialab/estransform').NewExpression} node
                     */
                    NewExpression(node) {
                        const value = getMetaUrl(node, ast);
                        if (typeof value !== 'string' || isUrl(value)) {
                            return;
                        }

                        promises.push(Promise.resolve().then(async () => {
                            const params = getChunkOptions(value);
                            const { path: resolvedPath } = await resolve({
                                kind: 'dynamic-import',
                                path: value.split('?')[0],
                                importer: args.path,
                                namespace: 'file',
                                resolveDir: rootDir,
                                pluginData: null,
                            });

                            if (!resolvedPath) {
                                return;
                            }

                            const loc = getSpanLocation(ast, node);
                            magicCode = magicCode || new MagicString(args.code);

                            if (!ids[resolvedPath]) {
                                const entryPoint = emitFileOrChunk(build, resolvedPath, params);
                                const { identifier, statement } = createImportStatement(entryPoint, value);
                                if (args.code.startsWith('#!')) {
                                    magicCode.appendRight(args.code.indexOf('\n') + 1, `${statement}\n`);
                                } else {
                                    magicCode.prepend(`${statement}\n`);
                                }
                                ids[resolvedPath] = identifier;
                            }

                            magicCode.overwrite(loc.start, loc.end, `new URL(${ids[resolvedPath]}, ${getBaseUrl()})`);
                        }));
                    },
                });

                await Promise.all(promises);

                if (!magicCode) {
                    return;
                }

                return {
                    code: magicCode.toString(),
                    map: magicCode.generateMap({
                        source: args.path,
                        includeContent: sourcesContent,
                        hires: true,
                    }),
                };
            });
        },
    };

    return plugin;
}
