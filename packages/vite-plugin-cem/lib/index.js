/**
 * @import { Package } from 'custom-elements-manifest';
 * @import { SourceFile, Plugin as AnalyzerPlugin } from '@chialab/cem-analyzer';
 * @import { Plugin, FilterPattern } from 'vite';
 */
import { bundle, createSourceFile as createSourceFileFallback } from '@chialab/cem-analyzer';
import { createFilter } from 'vite';

/**
 * @typedef {((sourceFile: SourceFile) => string | null | void) | Record<string, string> | string} ModulePath
 */

/**
 * @typedef {((customElementManifest: Package) => string | null | void) | string} ModuleReadme
 */

/**
 * @param {SourceFile[]} sourceFiles
 * @param {ModulePath} [modulePath]
 * @return {Record<string, SourceFile[]>}
 */
function groupSourceFiles(sourceFiles, modulePath) {
    /** @type {Record<string, SourceFile[]>} */
    const grouped = {};

    /**
     * @type {((sourceFile: SourceFile) => string | null | void) | null}
     */
    const toPath = modulePath
        ? typeof modulePath === 'function'
            ? modulePath
            : typeof modulePath === 'string'
              ? () => modulePath
              : (sourceFile) => modulePath[sourceFile.fileName]
        : null;

    sourceFiles.forEach((sourceFile) => {
        const path = toPath?.(sourceFile) ?? sourceFile.fileName;
        grouped[path] ??= [];
        grouped[path].push(sourceFile);
    });

    return grouped;
}

/**
 * @type {Map<string, Promise<unknown>>}
 */
const importCache = new Map();

/**
 * Attempts to dynamically import a module and returns null if the module is not found.
 * @param {string} moduleName The name of the module to import.
 * @returns {Promise<unknown>} The imported module or null if not found.
 */
async function tryImport(moduleName) {
    const loadPromise =
        importCache.get(moduleName) ||
        import(moduleName).catch((err) => {
            if (/** @type {{ code?: string }} */ (err).code === 'ERR_MODULE_NOT_FOUND') {
                return null;
            }
            throw err;
        });
    importCache.set(moduleName, loadPromise);
    return await loadPromise;
}

/**
 * Creates a SourceFile from the given code and identifier.
 * @param {string} id The identifier (file path) of the source code.
 * @param {string} code The source code to create the SourceFile from.
 * @returns {Promise<SourceFile>} The created SourceFile.
 */
async function createSourceFile(id, code) {
    const rolldown = /** @type {typeof import('rolldown/utils') | null} */ (await tryImport('rolldown/utils'));
    if (rolldown?.parse) {
        const { program, comments } = await rolldown.parse(id, code);
        return {
            fileName: id,
            program,
            comments,
        };
    }

    return createSourceFileFallback(id, code);
}

/**
 * @typedef {Object} CemPluginOptions
 * @property {FilterPattern} [include] - A filter pattern to include files for processing.
 * @property {FilterPattern} [exclude] - A filter pattern to exclude files from processing.
 * @property {AnalyzerPlugin[]} [plugins] - An array of plugins to use for processing the source files.
 * @property {string} [fileName] - The name of the output Custom Elements Manifest file.
 * @property {ModulePath} [modulePath] - A function or mapping to determine the module path for each source file.
 * @property {ModuleReadme} [moduleReadme] - A function or string to determine the README content for each module.
 * @property {Package[]} [thirdPartyManifests] - An array of third-party Custom Elements Manifests to include in the final output.
 */

/**
 * Generate a Custom Elements Manifest for Vite builds.
 * @param {CemPluginOptions} [options]
 * @returns {Plugin}
 */
export default function cemPlugin({
    include = /\.(j|t)sx?$/,
    exclude,
    plugins = [],
    fileName = 'custom-elements.json',
    modulePath,
    moduleReadme,
    thirdPartyManifests,
} = {}) {
    /**
     * @type {Set<SourceFile>}
     */
    const sourceFiles = new Set();
    const filter = createFilter(include, exclude);

    return {
        name: 'vite-plugin-cem',

        apply: 'build',

        enforce: 'pre',

        buildStart() {
            sourceFiles.clear();
        },

        async generateBundle() {
            const sourceFilesArr = Array.from(sourceFiles);
            sourceFiles.clear();
            const grouped = groupSourceFiles(sourceFilesArr, modulePath);
            const customElementsManifest = await bundle(grouped, {
                plugins: [...plugins],
                thirdPartyManifests,
            });
            if (typeof moduleReadme === 'function') {
                customElementsManifest.readme = moduleReadme(customElementsManifest) || undefined;
            } else if (typeof moduleReadme === 'string') {
                customElementsManifest.readme = moduleReadme || undefined;
            }
            this.emitFile({
                type: 'asset',
                fileName,
                source: JSON.stringify(customElementsManifest, null, 2),
            });
        },

        transform: {
            filter: {
                id: /\.tsx?$/,
            },
            async handler(code, id) {
                if (!filter(id) || id.match(/\.d\.ts$/)) {
                    return null;
                }
                sourceFiles.add(await createSourceFile(id, code));
            },
        },
    };
}
