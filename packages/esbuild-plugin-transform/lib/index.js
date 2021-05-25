import { promises } from 'fs';
import path from 'path';
import sourcemap from '@parcel/source-map';

const { readFile } = promises;
const { default: SourceMap } = sourcemap;

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
 * @typedef {{ filter: RegExp, store: Map<string, Entry>, getEntry(filePath: string): Promise<Entry>, buildEntry(filePath: string, extra?: Partial<import('esbuild').OnLoadResult>): Promise<import('esbuild').OnLoadResult|undefined>, finishEntry(filePath: string, extra?: Partial<import('esbuild').OnLoadResult>): Promise<import('esbuild').OnLoadResult|undefined> }} TransformOptions
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
        buildEntry: buildEntryFactory(build),
        finishEntry: buildEntryFactory(build),
    };
}

/**
 * @param {string} filePath
 * @return {Promise<Entry>}
 */
export async function createEntry(filePath) {
    const code = await readFile(filePath, 'utf-8');
    return {
        filePath,
        original: code,
        code,
        target: filePath.match(/\.tsx?$/) ? TARGETS.typescript : TARGETS.unknown,
        mappings: [],
    };
}

/**
 * @param {import('esbuild').PluginBuild} build
 */
function getEntryFactory(build) {
    /**
     * @param {string} filePath
     */
    async function getEntry(filePath) {
        const options = /** @type {BuildTransformOptions} */ (build.initialOptions);
        if (!options.transform) {
            return await createEntry(filePath);
        }

        const store = options.transform.store;
        const entry = store.get(filePath) || await createEntry(filePath);
        store.set(filePath, entry);
        return entry;
    }

    return getEntry;
}

/**
 * @param {import('esbuild').PluginBuild} build
 */
function buildEntryFactory(build, shouldReturn = true) {
    /**
     * @param {string} filePath
     * @param {Partial<import('esbuild').OnLoadResult>} extra
     * @return {Promise<import('esbuild').OnLoadResult|undefined>}
     */
    async function buildEntry(filePath, extra = {}) {
        if (!shouldReturn) {
            return;
        }

        const { store } = getTransformOptions(build);
        const entry = store.get(filePath);
        if (!entry) {
            return;
        }

        const { original, mappings, code } = entry;
        if (!mappings.length) {
            return {
                ...extra,
                loader: entry.loader || extra.loader || 'tsx',
                contents: code,
            };
        }

        const basename = path.basename(entry.filePath);
        const initialSourceMap = new SourceMap();
        initialSourceMap.setSourceContent(basename, original);
        const sourceMap = mappings.reduce((sourceMap, mapping) => {
            mapping.file = basename;
            mapping.sources = [basename];
            mapping.sourcesContent = [original];
            const map = new SourceMap();
            map.addVLQMap(mapping);
            map.extends(sourceMap.toBuffer());
            return map;
        }, initialSourceMap);

        const map = sourceMap.toVLQ();
        map.version = 3;
        map.file = basename;
        map.sources = [basename];
        map.sourcesContent = [original];

        return {
            ...extra,
            loader: entry.loader || extra.loader || 'tsx',
            contents: `${code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString('base64')}`,
        };
    }

    return buildEntry;
}

/**
 * @return An esbuild plugin.
 */
export function start() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'transform-start',
        setup(build) {
            /**
             * @type {Map<string, Entry>}
             */
            const store = new Map();
            const options = /** @type {BuildTransformOptions} */ (build.initialOptions);
            const filter = createFilter(options);

            Object.defineProperty(options, 'transform', {
                enumerable: false,
                writable: false,
                value: {
                    filter,
                    store,
                    getEntry: getEntryFactory(build),
                    buildEntry: buildEntryFactory(build, false),
                    finishEntry: buildEntryFactory(build),
                },
            });
        },
    };

    return plugin;
}

/**
 * @return An esbuild plugin.
 */
export function end() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'transform-end',
        setup(build) {
            const { filter, finishEntry } = getTransformOptions(build);

            build.onLoad({ filter, namespace: 'file' }, async (args) => finishEntry(args.path, {
                loader: 'tsx',
            }));
        },
    };

    return plugin;
}
