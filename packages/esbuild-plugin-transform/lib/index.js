import { promises } from 'fs';
import path from 'path';
import sourcemap from '@parcel/source-map';

const { readFile } = promises;
const { default: SourceMapNode } = sourcemap;

/**
 * @typedef {Object} SourceMap
 * @property {number} version
 * @property {string[]} sources
 * @property {string[]} names
 * @property {string} [sourceRoot]
 * @property {string[]} [sourcesContent]
 * @property {string} mappings
 * @property {string} file
 */

export const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

export const TARGETS = {
    unknown: 'unknown',
    typescript: 'typescript',
    es2020: 'es2020',
    es2019: 'es2019',
    es2018: 'es2018',
    es2017: 'es2017',
    es2016: 'es2016',
    es2015: 'es2015',
    es5: 'es5',
};

/**
 * @typedef {{ filePath: string, original: string, code: string, target: string, loader?: import('esbuild').Loader, mappings: SourceMap[] }} Entry
 */

/**
 * @typedef {(filePath: string, result: { code: string, map?: SourceMap|SourceMap[], loader?: import('esbuild').Loader }, extra?: Partial<import('esbuild').OnLoadResult>) => Promise<import('esbuild').OnLoadResult|undefined>} BuildFactory
 */

/**
 * @typedef {{ entry?: Entry, filter: RegExp, store: Map<string, Entry>, getEntry(filePath: string): Promise<Entry>, buildEntry: BuildFactory }} TransformOptions
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
 * @param {string} filePath
 * @param {string} [contents]
 * @return {Promise<Entry>}
 */
export async function createEntry(filePath, contents) {
    const code = contents || await readFile(filePath, 'utf-8');
    return {
        filePath,
        original: code,
        code,
        target: filePath.match(/\.tsx?$/) ? TARGETS.typescript : TARGETS.unknown,
        mappings: [],
    };
}

/**
 * Transpile entry to standard js.
 * @param {Entry} entry
 * @param {typeof import('esbuild')} esbuild
 * @param {import('esbuild').BuildOptions} [options]
 */
export async function transpileEntry(entry, esbuild, options = {}) {
    if (entry.target !== TARGETS.typescript) {
        return {
            code: entry.code,
            loader: entry.loader,
        };
    }
    const loaders = options.loader || {};
    const { code, map } = await esbuild.transform(entry.code, {
        sourcefile: entry.filePath,
        sourcemap: true,
        loader: loaders[path.extname(entry.filePath)] === 'ts' ? 'ts' : 'tsx',
        format: 'esm',
        target: TARGETS.es2020,
        jsxFactory: options.jsxFactory,
        jsxFragment: options.jsxFragment,
    });

    return {
        code,
        map,
        loader: /** @type {import('esbuild').Loader} */ ('js'),
    };
}

/**
 * @param {import('esbuild').PluginBuild} build
 */
function getEntryFactory(build) {
    /**
     * @param {string} filePath
     * @param {string} [initialContents]
     */
    async function getEntry(filePath, initialContents) {
        const options = /** @type {BuildTransformOptions} */ (build.initialOptions);
        if (!options.transform) {
            return await createEntry(filePath, initialContents);
        }

        const store = options.transform.store;
        const entry = store.get(filePath) || await createEntry(filePath, initialContents);
        store.set(filePath, entry);
        return entry;
    }

    return getEntry;
}

/**
 * @param {string} basename
 * @param {string} original
 */
function createInitialSourceMap(basename, original) {
    const initialSourceMap = new SourceMapNode();
    initialSourceMap.setSourceContent(basename, original);
    return initialSourceMap;
}

/**
 * @param {string} basename
 * @param {string} original
 * @param {SourceMap[]} mappings
 */
function mergeMappings(basename, original, mappings) {
    const initial = createInitialSourceMap(basename, original);
    const sourceMap = mappings.reduce((sourceMap, mapping) => {
        mapping.file = basename;
        mapping.sources = [basename];
        mapping.sourcesContent = [original];
        try {
            const map = new SourceMapNode();
            map.addVLQMap(mapping);
            map.extends(sourceMap.toBuffer());
            return map;
        } catch (err) {
            //
        }
        return sourceMap;
    }, initial);

    return sourceMap.toVLQ();
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {import('esbuild').BuildOptions} options
 */
function buildEntryFactory(build, options, shouldReturn = true) {
    /**
     * @type {BuildFactory}
     */
    async function buildEntry(filePath, { code, map, loader }, extra = {}) {
        const { store } = getTransformOptions(build);
        const entry = store.get(filePath);
        if (!entry) {
            return;
        }

        if (!shouldReturn) {
            entry.code = code;
            if (Array.isArray(map)) {
                entry.mappings.push(...map);
            } else if (map) {
                entry.mappings.push(map);
            }
            if (loader) {
                entry.loader = loader;
            }
            return;
        }

        const loaders = options.loader || {};
        const defaultLoader = (loaders[path.extname(filePath)] === 'ts' ? 'ts' : 'tsx');
        const { original } = entry;
        const mappings = Array.isArray(map) ? map : (map ? [map] : entry.mappings);
        if (!mappings.length) {
            return {
                ...extra,
                loader: entry.loader || extra.loader || defaultLoader,
                contents: code,
            };
        }

        const basename = path.basename(entry.filePath);
        const finalMap = mappings.length > 1 ? mergeMappings(basename, original, mappings) : mappings[0];
        finalMap.version = 3;
        finalMap.file = basename;
        finalMap.sources = [basename];
        finalMap.sourcesContent = [original];

        return {
            ...extra,
            loader: entry.loader || extra.loader || defaultLoader,
            contents: `${code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(finalMap)).toString('base64')}`,
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
             * @type {Map<string, Entry>}
             */
            const store = new Map();
            const options = /** @type {BuildTransformOptions} */ (build.initialOptions);
            const filter = createFilter(options);

            const getEntry = getEntryFactory(build);
            const buildEntry = buildEntryFactory(build, options, false);
            const finishEntry = buildEntryFactory(build, options);

            const { stdin, loader: loaders = {} } = options;
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

                const { code, mappings, loader } = await getEntry(args.path);
                return finishEntry(args.path, {
                    code,
                    map: mappings,
                    loader,
                }, {
                    loader: loaders[path.extname(args.path)] === 'ts' ? 'ts' : 'tsx',
                });
            });
        },
    };

    return plugin;
}

