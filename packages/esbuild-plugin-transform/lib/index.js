import path from 'path';
import { readFile } from 'fs/promises';
import { getRootDir } from '@chialab/esbuild-helpers';
import { createPipeline, finalize } from '@chialab/estransform';
import { escapeRegexBody } from '@chialab/node-resolve';

export const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

/**
 * @typedef {Map<string, import('@chialab/estransform').Pipeline>} Store
 */

/**
 * @typedef {Object} TransformOptions
 * @property {import('@chialab/estransform').Pipeline} [entry]
 * @property {RegExp} filter
 * @property {Store} store
 * @property {import('esbuild').PluginBuild} parent
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
        sourcemap: !!build.initialOptions.sourcemap,
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
 * @param {import('esbuild').PluginBuild} build
 * @param {string} filePath
 * @param {import('esbuild').Loader} [defaultValue]
 */
export function getTransformLoader(build, filePath, defaultValue = 'file') {
    const loaders = build.initialOptions.loader || {};
    const ext = path.extname(filePath);
    return loaders[ext] || defaultValue;
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @return {import('esbuild').PluginBuild|null}
 */
export function getParentBuild(build) {
    const options = build.initialOptions;
    const transformOptions = /** @type {BuildTransformOptions} */ (options).transform;
    if (!transformOptions) {
        return null;
    }

    return transformOptions.parent;
}

/**
 * @param {import('esbuild').PluginBuild} build
 */
export function cleanUp(build) {
    const options = build.initialOptions;
    const transformOptions = /** @type {BuildTransformOptions} */ (options).transform;
    if (!transformOptions) {
        return null;
    }

    transformOptions.store.clear();
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {import('esbuild').Plugin} plugin
 * @param {'start'|'end'} [where]
 */
export async function addTransformationPlugin(build, plugin, where = 'end') {
    const options = build.initialOptions;
    if (!options.plugins) {
        throw new Error('Transform plugin is not initialized');
    }

    const transformPlugin = options.plugins.find(({ name }) => name === 'transform');
    if (!transformPlugin) {
        throw new Error('Transform plugin is not initialized');
    }

    const plugins = (/** @type {TransformPlugin} */ (transformPlugin)).plugins;
    if (where === 'start') {
        plugins.unshift(plugin);
    } else {
        plugins.push(plugin);
    }
}

/**
 * @typedef {(args: import('esbuild').OnLoadArgs) => import('esbuild').OnLoadResult} LoadCallback
 */

/**
 * @typedef {import('esbuild').Plugin & { plugins: import('esbuild').Plugin[] }} TransformPlugin
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
        async setup(build) {
            /**
             * @type {Store}
             */
            const store = new Map();
            const options = build.initialOptions;
            const filter = createFilter(build);

            const { stdin } = options;
            const input = stdin ? (stdin.sourcefile || 'stdin.js') : undefined;
            const rootDir = getRootDir(build);
            const fullInput = input && path.resolve(rootDir, input);
            if (stdin && input) {
                const regex = new RegExp(escapeRegexBody(input));
                build.onResolve({ filter: regex }, () => ({
                    path: path.resolve(rootDir, input),
                    namespace: 'file',
                }));
                delete options.stdin;
                options.entryPoints = [input];
            }

            const transformPlugins = (/** @type {TransformPlugin} */ (plugin)).plugins;

            const childOptions = {
                ...build.initialOptions,
                plugins: transformPlugins,
            };

            /**
             * @type {TransformOptions}
             */
            const transformData = {
                store,
                filter,
                parent: build,
            };

            /**
             * @type {Map<import('esbuild').Plugin, LoadCallback>}
             */
            const onLoadCallbacks = new Map();

            Object.defineProperty(options, 'transform', {
                configurable: true,
                enumerable: false,
                writable: false,
                value: transformData,
            });
            Object.defineProperty(childOptions, 'transform', {
                configurable: true,
                enumerable: false,
                writable: false,
                value: transformData,
            });

            build.onEnd(() => {
                cleanUp(build);
            });

            for (let i = 0; i < transformPlugins.length; i++) {
                const transfromPlugin = transformPlugins[i];
                await transfromPlugin.setup({
                    initialOptions: childOptions,
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
                            onLoadCallbacks.set(transfromPlugin, callback);
                        } else {
                            build.onLoad(options, callback);
                        }
                    },
                });
            }

            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                if (!onLoadCallbacks.size) {
                    return;
                }

                let entry;
                if (args.path === fullInput && stdin) {
                    entry = await getEntry(build, args.path, stdin.contents.toString());
                } else {
                    entry = await getEntry(build, args.path);
                }

                args.pluginData = entry;

                for (let i = 0; i < transformPlugins.length; i++) {
                    const transformPlugin = transformPlugins[i];
                    const onLoad = onLoadCallbacks.get(transformPlugin);
                    if (onLoad) {
                        await onLoad(args);
                    }
                }

                if (entry.code === entry.contents) {
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
        },
    };

    Object.defineProperty(plugin, 'plugins', {
        enumerable: false,
        writable: false,
        value: [...plugins],
    });

    return plugin;
}

/**
 * @param {string} pluginName
 * @param {unknown} originalError
 */
export function transformError(pluginName, originalError) {
    const errorMessage = originalError instanceof Error ? `${originalError.message}\n${originalError.stack}` : originalError;
    return new Error(`${pluginName}: an error occurred during transformation.\n\n${errorMessage}`);
}
