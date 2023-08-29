import path from 'path';
import process from 'process';
import { writeFile } from 'fs/promises';
import { writeManifestJson } from './writeManifestJson.js';
import { generateEntrypointsJson, writeEntrypointsJson } from './writeEntrypointsJson.js';

export { generateEntrypointsJson };

/**
 * @typedef {{ metafilePath?: string; manifestPath?: string; entrypointsPath?: string }} PluginOptions
 */

/**
 * Write metadata JSON files for builds.
 * @param {PluginOptions} options Plugin options.
 * @returns An esbuild plugin.
 */
export default function(options = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'metadata',
        setup(build) {
            const {
                metafilePath,
                manifestPath,
                entrypointsPath,
            } = options;

            const {
                entryPoints,
                absWorkingDir = process.cwd(),
                loader,
                format = 'esm',
                publicPath,
            } = build.initialOptions;

            build.onEnd(async (result) => {
                if (typeof metafilePath === 'string' && result.metafile) {
                    await writeFile(path.resolve(absWorkingDir, metafilePath), JSON.stringify(result.metafile, null, 2));
                }
                if (manifestPath && result) {
                    await writeManifestJson(result, manifestPath, publicPath);
                }
                if (entrypointsPath && entryPoints && result) {
                    const files = (Array.isArray(entryPoints) ? entryPoints : Object.values(entryPoints))
                        .map((entryPoint) => (typeof entryPoint === 'string' ? entryPoint : entryPoint.in));

                    await writeEntrypointsJson(files, result, absWorkingDir, entrypointsPath, publicPath || '/', loader || {}, format);
                }
            });
        },
    };

    return plugin;
}
