import { inlineSourcemap, transform as esTransform, walk, getOffsetFromLocation } from '@chialab/estransform';
import { init, parse } from 'cjs-module-lexer';

export const REQUIRE_REGEX = /([^.\w$]|^)require\s*\((['"])(.*?)\2\)/g;
export const UMD_REGEXES = [
    /\btypeof\s+exports\s*===?\s*['|"]object['|"]/,
    /\btypeof\s+define\s*===?\s*['|"]function['|"]/,
];
export const UMD_GLOBALS = ['globalThis', 'global', 'self', 'window'];
export const UMD_GLOBALS_REGEXES = UMD_GLOBALS.map((varName) => new RegExp(`\\btypeof\\s+(${varName})\\s*!==?\\s*['|"]undefined['|"]`));
export const ESM_KEYWORDS = /((?:^\s*|;\s*)(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from|\*\s*as\s+[^\s]+\s+from)?\s*['"])|((?:^\s*|;\s*)export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{)))/m;
export const CJS_KEYWORDS = /\b(module\.exports|exports|require)\b/;

/**
 * Check if there is chanches that the provided code is a commonjs module.
 * @param {string} code
 */
export function maybeCommonjsModule(code) {
    return !ESM_KEYWORDS.test(code) && CJS_KEYWORDS.test(code);
}

/**
 * @typedef {{ source?: string, sourcemap?: boolean|'inline', sourcesContent?: boolean, ignore?(specifier: string): boolean }} Options
 */

/**
 * @param {Options} options
 */
export function createTransform({ ignore = () => false }) {
    const specs = new Map();
    const ns = new Map();

    /**
     * @type {Promise<void>}
     */
    let initialize;

    /**
     * @type {import('@chialab/estransform').TransformCallack}
     */
    const transform = async (data) => {
        const { magicCode, code } = data;
        const isUmd = UMD_REGEXES.every((regex) => regex.test(code));
        let insertHelper = false;
        if (!isUmd) {
            const ast = data.ast;
            walk(ast, {
                /**
                 * @param {*} node
                 */
                CallExpression(node) {
                    if (!node.callee || node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
                        return;
                    }

                    if (node.arguments.length !== 1 || node.arguments[0].type !== 'Literal') {
                        return;
                    }

                    const specifier = node.arguments[0].value;
                    let spec = specs.get(specifier);
                    if (!spec) {
                        let id = `$cjs$${specifier.replace(/[^\w_$]+/g, '_')}`;
                        const count = (ns.get(id) || 0) + 1;
                        ns.set(id, count);
                        if (count > 1) {
                            id += count;
                        }
                        if (ignore(specifier)) {
                            return;
                        }
                        spec = { id, specifier };
                        specs.set(specifier, spec);
                    }

                    insertHelper = true;
                    magicCode.overwrite(
                        getOffsetFromLocation(code, node.loc.start.line, node.loc.start.column),
                        getOffsetFromLocation(code, node.loc.end.line, node.loc.end.column),
                        `$$cjs_default$$(${spec.id})`
                    );
                },
            });
        }

        if (isUmd) {
            let endDefinition = code.indexOf('\'use strict\';');
            if (endDefinition === -1) {
                endDefinition = code.indexOf('"use strict";');
            }
            if (endDefinition === -1) {
                endDefinition = code.length;
            }

            let varName = '';
            UMD_GLOBALS.forEach((name, index) => {
                const regex = UMD_GLOBALS_REGEXES[index];
                const match = code.match(regex);
                if (match && match.index != null && match.index < endDefinition) {
                    if (varName) {
                        magicCode.overwrite(match.index, match.index + match[0].length, 'false');
                    } else {
                        varName = name;
                    }
                }
            });
            magicCode.prepend(`var __umd = {}; (function(${varName || '_'}) {\n`);
            magicCode.append('\n }).call(__umd, __umd);');
            magicCode.append('\nvar __umdKeys = Object.keys(__umd);');
            magicCode.append('\nvar __umdExport = __umdKeys.length === 1 ? __umdKeys[0] : false;');
            magicCode.append('\nif (__umdExport && typeof window !== \'undefined\') window[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nif (__umdExport && typeof self !== \'undefined\') self[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nif (__umdExport && typeof global !== \'undefined\') global[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nif (__umdExport && typeof globalThis !== \'undefined\') globalThis[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nexport default (__umdExport ? __umd[__umdExport] : __umd);');
        } else {
            initialize = initialize || init();
            await initialize;
            const { exports, reexports } = parse(code);
            magicCode.prepend('var module = { exports: {} }, exports = module.exports;\n');
            magicCode.append('\nexport default ((typeof module.exports === \'object\' && \'default\' in module.exports) ? module.exports.default : module.exports);');
            const named = exports.filter((entry) => entry !== '__esModule' && entry !== 'default');
            if (named.length) {
                named.forEach((name, index) => {
                    magicCode.append(`\nconst __export${index} = module.exports['${name}']`);
                });
                magicCode.append(`\nexport { ${named.map((name, index) => `__export${index} as ${name}`).join(', ')} }`);
            }
            reexports.forEach((reexport) => {
                magicCode.append(`\nexport * from '${reexport}';`);
            });
        }

        if (insertHelper) {
            magicCode.prepend('function $$cjs_default$$(m, i) { for (i in m) if (i != \'default\') return m; if (typeof m == \'object\' && \'default\' in m) return m.default; return m; }\n');
        }

        specs.forEach(spec => {
            magicCode.prepend(`import * as ${spec.id} from "${spec.specifier}";\n`);
        });
    };

    return transform;
}

/**
 * @param {string} contents
 * @param {Options} options
 * @return {Promise<import('@chialab/estransform').TransformResult>}
 */
export async function transform(contents, { source, sourcemap = true, sourcesContent = false, ignore = () => false } = {}) {
    const { code, map } = await esTransform(contents, {
        source,
        sourcesContent,
    }, createTransform({ ignore }));

    if (!sourcemap || !map) {
        return {
            code,
            map: null,
        };
    }

    if (sourcemap === 'inline' && code) {
        return {
            code: inlineSourcemap(code, map),
            map,
        };
    }

    return {
        code,
        map,
    };
}
