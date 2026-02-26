/**
 * @import { Package } from 'custom-elements-manifest';
 * @import { SourceFile } from '@chialab/cem-analyzer';
 * @import { Plugin, FilterPattern } from 'vite';
 */
import { bundle, createSourceFile, dnaPlugins } from '@chialab/cem-analyzer';
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
