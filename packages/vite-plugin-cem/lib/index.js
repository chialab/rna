/**
 * @import { Package } from 'custom-elements-manifest';
 * @import { SourceFile } from '@chialab/cem-analyzer';
 * @import { Plugin, FilterPattern } from 'vite';
 */
import { bundle, createSourceFile as createSourceFileFallback, dnaPlugins } from '@chialab/cem-analyzer';
import { createFilter } from 'vite';

/**
 * @typedef {((sourceFile: SourceFile) => string | null | void) | Record<string, string> | string} ModulePath
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
        const { program, comments } = await rolldown.parse(code, id);
        return {
            fileName: id,
            program,
            comments,
        };
    }

    return createSourceFileFallback(id, code);
}

/**
 * Generate a Custom Elements Manifest for Vite builds.
 * @param {{ include?: FilterPattern; exclude?: FilterPattern; fileName?: string; modulePath?: ModulePath; thirdPartyManifests?: Package[]; }} [options]
 * @returns {Plugin}
 */
export default function cemPlugin({
    include = /\.(j|t)sx?$/,
    exclude,
    fileName = 'custom-elements.json',
    modulePath,
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
                plugins: [...dnaPlugins],
                thirdPartyManifests,
            });
            customElementsManifest.modules.sort((a, b) => a.path.localeCompare(b.path));
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
