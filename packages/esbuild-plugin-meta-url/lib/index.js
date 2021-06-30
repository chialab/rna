import { promises } from 'fs';
import path from 'path';
import esbuildModule from 'esbuild';
import MagicString from 'magic-string';
import nodeResolve from 'resolve';
import { SCRIPT_LOADERS, getTransformOptions } from '@chialab/esbuild-plugin-transform';

const { readFile } = promises;

const URL_REGEX = /(new\s+(?:window\.|self\.|globalThis\.)?URL\s*\()\s*['"]([^'"]*)['"]\s*\s*,\s*import\.meta\.url\s*(\))/g;

/**
 * @param {string} spec
 * @param {string} importer
 */
function resolve(spec, importer) {
    return new Promise((resolve, reject) => nodeResolve(spec, {
        basedir: path.dirname(importer),
        preserveSymlinks: true,
    }, (err, data) => (err ? reject(err) : resolve(data))));
}

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export default function({ esbuild = esbuildModule } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        setup(build) {
            const options = build.initialOptions;
            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onResolve({ filter: /\.urlfile$/ }, async ({ path: filePath }) => ({
                path: filePath.replace(/\.urlfile$/, ''),
                namespace: 'meta-url',
            }));
            build.onLoad({ filter: /\./, namespace: 'meta-url' }, async ({ path: filePath }) => ({
                contents: await readFile(filePath),
                loader: 'file',
            }));
            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                const entry = await await getEntry(args.path);
                if (!entry.code.match(URL_REGEX)) {
                    return;
                }

                const outdir = options.outdir || (options.outfile && path.dirname(options.outfile)) || process.cwd();
                const loaders = options.loader || {};
                const code = entry.code;
                const magicCode = new MagicString(code);

                /**
                 * @type {{ [key: string]: string }}
                 */
                const ids = {};

                let match = URL_REGEX.exec(code);
                while (match) {
                    const len = match[0].length;
                    const value = match[2];

                    const loader = loaders[path.extname(value)];
                    let baseUrl = 'import.meta.url';
                    if (options.platform === 'browser' && options.format !== 'esm') {
                        baseUrl = 'document.baseURI';
                    } else if (options.platform === 'node' && options.format !== 'esm') {
                        baseUrl = '\'file://\' + __filename';
                    }
                    const entryPoint = await resolve(value, args.path);
                    if (SCRIPT_LOADERS.includes(loader) || loader === 'css') {
                        /** @type {import('esbuild').BuildOptions} */
                        const config = {
                            ...options,
                            entryPoints: [entryPoint],
                            outfile: undefined,
                            outdir,
                            metafile: true,
                        };
                        const result = await esbuild.build(config);
                        if (result.metafile) {
                            const outputs = result.metafile.outputs;
                            const outputFiles = Object.keys(outputs);
                            const outputFile = outputFiles
                                .filter((output) => !output.endsWith('.map'))
                                .filter((output) => outputs[output].entryPoint)
                                .find((output) => entryPoint === path.resolve(/** @type {string} */(outputs[output].entryPoint))) || outputFiles[0];
                            magicCode.overwrite(match.index, match.index + len, `${match[1]}'./${path.basename(outputFile)}', ${baseUrl}${match[3]}`);
                        }
                    } else {
                        if (!ids[entryPoint]) {
                            const identifier = ids[entryPoint] = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                            if (code.startsWith('#!')) {
                                magicCode.appendRight(code.indexOf('\n') + 1, `import ${identifier} from '${entryPoint}.urlfile';\n`);
                            } else {
                                magicCode.prepend(`import ${identifier} from '${entryPoint}.urlfile';\n`);
                            }
                        }
                        magicCode.overwrite(match.index, match.index + len, `${match[1]}${ids[entryPoint]}, ${baseUrl}${match[3]}`);
                    }

                    match = URL_REGEX.exec(code);
                }

                const map = JSON.parse(magicCode.generateMap({
                    source: args.path,
                    hires: true,
                    includeContent: true,
                }).toString());
                entry.code = magicCode.toString();
                entry.mappings.push(map);

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
