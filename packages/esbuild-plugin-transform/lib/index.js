import path from 'path';
import { promises } from 'fs';
import { createPipeline, finalize } from '@chialab/estransform';

const { readFile } = promises;

export const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

/**
 * @typedef {Map<string, import('@chialab/estransform').Pipeline>} Store
 */

/**
 * @typedef {{ entry?: import('@chialab/estransform').Pipeline, filter: RegExp, store: Store }} TransformOptions
 */

/**
 * @typedef {import('esbuild').BuildOptions & { transform?: TransformOptions }} BuildTransformOptions
 */

/**
 * @param {import('esbuild').PluginBuild} build
 */
export function createFilter(build) {
    const options = build.initialOptions;
    const transformOptions = /** @type {BuildTransformOptions} */ (options).transform;
    if (transformOptions && transformOptions.filter) {
        return transformOptions.filter;
    }

    const loaders = options.loader || {};
    const keys = Object.keys(loaders);
    const tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loaders[key]));
    return new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {string} filePath
 * @param {string} [contents]
 * @return {Promise<import('@chialab/estransform').Pipeline>}
 */
export async function getEntry(build, filePath, contents) {
    const options = /** @type {BuildTransformOptions} */ (build.initialOptions).transform;
    const entry = options?.store.get(filePath) || await createPipeline(contents || await readFile(filePath, 'utf-8'), {
        source: filePath,
    });
    options?.store.set(filePath, entry);
    return entry;
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {string} filePath
 * @return {Promise<import('esbuild').OnLoadResult|undefined>}
 */
export async function finalizeEntry(build, filePath) {
    const options = /** @type {BuildTransformOptions} */ (build.initialOptions).transform;
    if (options) {
        return;
    }

    const entry = await getEntry(build, filePath);
    const { code, loader } = await finalize(entry, {
        sourcemap: 'inline',
        source: path.basename(filePath),
        sourcesContent: build.initialOptions.sourcesContent,
    });

    return {
        contents: code,
        loader,
    };
}

/**
 * @typedef {(args: import('esbuild').OnLoadArgs) => import('esbuild').OnLoadResult} LoadCallback
 */

/**
 * @param {import('esbuild').Plugin[]} plugins
 * @return An esbuild plugin.
 */
export default function(plugins = []) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'transform',
        setup(build) {
            /**
             * @type {Store}
             */
            const store = new Map();
            const options = build.initialOptions;
            const filter = createFilter(build);

            const { stdin } = options;
            const input = stdin ? (stdin.sourcefile || 'stdin.js') : undefined;
            if (stdin && input) {
                const regex = new RegExp(input.replace(/([()[\]{}\\\-+.*?^$])/g, '\\$1'));
                build.onResolve({ filter: regex }, () => ({ path: input, namespace: 'file' }));
                delete options.stdin;
                options.entryPoints = [input];
            }

            Object.defineProperty(options, 'transform', {
                enumerable: false,
                writable: false,
                value: {
                    store,
                    filter,
                },
            });

            /**
             * @type {LoadCallback[]}
             */
            const onLoad = [];
            for (let i = 0; i < plugins.length; i++) {
                plugins[i].setup({
                    initialOptions: build.initialOptions,
                    onStart: build.onStart.bind(build),
                    onEnd: build.onEnd.bind(build),
                    onResolve: build.onResolve.bind(build),
                    /**
                     * @param {import('esbuild').OnLoadOptions} options
                     * @param {LoadCallback} callback
                     */
                    onLoad(options, callback) {
                        if (options.namespace === 'file' &&
                            options.filter === filter) {
                            onLoad.push(callback);
                        } else {
                            build.onLoad(options, callback);
                        }
                    },
                });
            }

            if (onLoad.length) {
                build.onLoad({ filter, namespace: 'file' }, async (args) => {
                    let transformed = false;
                    let entry;
                    if (args.path === input && stdin) {
                        entry = await getEntry(build, args.path, stdin.contents);
                        transformed = true;
                    } else {
                        entry = await getEntry(build, args.path);
                    }

                    args.pluginData = entry;

                    for (let i = 0; i < onLoad.length; i++) {
                        const result = onLoad[i](args);
                        if (result) {
                            transformed = true;
                            await result;
                        }
                    }

                    if (!transformed) {
                        return {
                            contents: entry.code,
                            loader: entry.loader,
                        };
                    }

                    const { code, loader } = await finalize(entry, {
                        sourcemap: 'inline',
                        source: path.basename(args.path),
                        sourcesContent: options.sourcesContent,
                    });

                    return {
                        contents: code,
                        loader,
                    };
                });
            }
        },
    };

    return plugin;
}

