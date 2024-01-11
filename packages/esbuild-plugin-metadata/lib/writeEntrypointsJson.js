import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Map build entrypoints to entrypoints.json
 * @param {string[]} entrypoints The build entrypoints.
 * @param {Record<string, import('esbuild').Loader>} loaders The build loaders.
 * @param {import('esbuild').Format} format The output format.
 * @param {(entrypoint: string) => string} resolve The resolution callback for the endpoint.
 */
export function generateEntrypointsJson(entrypoints, loaders, format = 'esm', resolve = (entrypoint) => entrypoint) {
    return entrypoints.reduce((json, entrypoint) => {
        const extname = path.extname(entrypoint);
        const basename = path.basename(entrypoint, extname);
        const loader = loaders[extname] || 'tsx';
        const map = (json[basename] = json[basename] || {
            format,
            js: [],
            css: [],
        });

        const outputFile = resolve(entrypoint);

        switch (loader) {
            case 'css': {
                map.css.push(outputFile);
                break;
            }
            default: {
                map.js.push(outputFile);
                break;
            }
        }

        return json;
    }, /** @type {{[file: string]: { js: string[], css: string[] }}} */ ({}));
}

/**
 * Write entrypoints.json
 * @param {string[]} entrypoints The build entrypoints.
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} rootDir The root dir.
 * @param {string} outputFile The output file or dir.
 * @param {string} publicPath The public path.
 * @param {Record<string, import('esbuild').Loader>} loaders The build loaders.
 * @param {import('esbuild').Format} format The output format.
 */
export async function writeEntrypointsJson(entrypoints, result, rootDir, outputFile, publicPath, loaders, format) {
    const { metafile } = result;
    if (!metafile) {
        return;
    }

    const { outputs } = metafile;
    const outputsByEntrypoint = Object.keys(outputs).reduce((map, outputName) => {
        const output = outputs[outputName];
        if (!output.entryPoint) {
            return map;
        }
        map[path.resolve(rootDir, output.entryPoint)] = path.resolve(rootDir, outputName);

        return map;
    }, /** @type {{ [key: string]: string }} */ ({}));

    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    const entrypointsJson = generateEntrypointsJson(entrypoints, loaders, format, (entrypoint) =>
        path.join(publicPath, path.relative(outputDir, outputsByEntrypoint[path.resolve(rootDir, entrypoint)]))
    );

    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}
