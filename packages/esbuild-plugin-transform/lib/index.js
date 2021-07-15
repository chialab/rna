import path from 'path';
import { promises } from 'fs';
import { createPipeline, finalize } from '@chialab/estransform';

const { readFile } = promises;

export const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

/**
 * @typedef {(filePath: string, contents?: string) => Promise<import('@chialab/estransform').Pipeline>} GetEntry
 */

/**
 * @typedef {(filePath: string) => Promise<import('esbuild').OnLoadResult|undefined>} BuildFactory
 */

/**
 * @typedef {Map<string, import('@chialab/estransform').Pipeline>} Store
 */

/**
 * @typedef {{ entry?: import('@chialab/estransform').Pipeline, filter: RegExp, store: Store, getEntry: GetEntry, buildEntry: BuildFactory }} TransformOptions
 */

/**
 * @typedef {import('esbuild').BuildOptions & { transform?: TransformOptions }} BuildTransformOptions
 */

/**
 * @param {import('esbuild').BuildOptions} options
 */
export function createFilter(options) {
    const loaders = options.loader || {};
    const keys = Object.keys(loaders);
    const tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loaders[key]));
    return new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @return {TransformOptions}
 */
export function getTransformOptions(build) {
    const options = /** @type {BuildTransformOptions} */ (build.initialOptions);
    if (options.transform) {
        return options.transform;
    }

    return {
        store: new Map(),
        filter: createFilter(options),
        getEntry: getEntryFactory(build),
        buildEntry: buildEntryFactory(build, options),
    };
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @return {GetEntry}
 */
function getEntryFactory(build) {
    /**
     * @type {GetEntry}
     */
    async function getEntry(filePath, contents) {
        const { store } = getTransformOptions(build);
        const entry = store.get(filePath) || await createPipeline(contents || await readFile(filePath, 'utf-8'), { source: filePath });
        store.set(filePath, entry);
        return entry;
    }

    return getEntry;
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {import('esbuild').BuildOptions} options
 */
function buildEntryFactory(build, options, shouldReturn = true) {
    /**
     * @type {BuildFactory}
     */
    async function buildEntry(filePath) {
        const { store } = getTransformOptions(build);
        const entry = store.get(filePath);
        if (!entry) {
            return;
        }

        if (!shouldReturn) {
            return;
        }

        const { code, loader } = await finalize(entry, {
            sourcemap: 'inline',
            source: path.basename(filePath),
            sourcesContent: options.sourcesContent,
        });

        return {
            contents: code,
            loader,
        };
    }

    return buildEntry;
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
            const options = /** @type {BuildTransformOptions} */ (build.initialOptions);
            const filter = createFilter(options);

            const getEntry = getEntryFactory(build);
            const buildEntry = buildEntryFactory(build, options, false);
            const finishEntry = buildEntryFactory(build, options);

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
                    filter,
                    store,
                    getEntry,
                    buildEntry,
                },
            });

            /**
             * @type {Array<[import('esbuild').OnLoadOptions, LoadCallback]>}
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
                        if (options.namespace === 'file') {
                            onLoad.push([options, callback]);
                        } else {
                            build.onLoad(options, callback);
                        }
                    },
                });
            }

            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                if (args.path === input && stdin) {
                    await getEntry(args.path, stdin.contents);
                }

                for (let i = 0; i < onLoad.length; i++) {
                    const [{ filter, namespace }, callback] = onLoad[i];
                    if (!filter.test(args.path) || (namespace && namespace !== args.namespace)) {
                        continue;
                    }
                    await callback(args);
                }

                return finishEntry(args.path);
            });
        },
    };

    return plugin;
}

