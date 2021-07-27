import { writeFile } from 'fs/promises';
import path from 'path';
import { loaders } from './loaders.js';

/**
 * Write entrypoints.json
 * @param {string[]} entrypoints The build entrypoints.
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} rootDir The root dir.
 * @param {string} outputFile The output file or dir.
 * @param {string} publicPath The public path.
 * @param {import('@chialab/rna-config-loader').Format} format The output format.
 */
export async function saveEntrypointsJson(entrypoints, result, rootDir, outputFile, publicPath = '/', format) {
    const { metafile } = result;
    if (!metafile) {
        return;
    }
    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    const { outputs } = metafile;
    const outputsByEntrypoint = Object.keys(outputs)
        .reduce((map, outputName) => {
            const output = outputs[outputName];
            if (!output.entryPoint) {
                return map;
            }
            map[path.resolve(rootDir, output.entryPoint)] = path.resolve(rootDir, outputName);

            return map;
        }, /** @type {{ [key: string]: string }} */ ({}));

    const entrypointsJson = entrypoints.reduce((json, entrypoint) => {
        const extname = path.extname(entrypoint);
        const basename = path.basename(entrypoint, extname);
        const loader = loaders[extname] || 'tsx';
        const map = json[basename] = json[basename] || {
            format,
            js: [],
            css: [],
        };
        const outputFile = path.join(publicPath, path.relative(outputDir, outputsByEntrypoint[entrypoint]));

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

    await writeFile(outputFile, JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}


/**
 * Write entrypoints.json for dev server
 * @param {string[]} entrypoints The build entrypoints.
 * @param {string} outputFile The output file or dir.
 * @param {import('@web/dev-server-core').DevServer} server The server instance.
 * @param {import('@chialab/rna-config-loader').Format} format The output format.
 */
export async function saveDevEntrypointsJson(entrypoints, outputFile, server, format) {
    const { config } = server;
    const base = `http${config.http2 ? 's' : ''}://${config.hostname ?? 'localhost'}:${config.port}`;
    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    const webSocketImport = server.webSockets && server.webSockets.webSocketImport && new URL(server.webSockets.webSocketImport, base).href;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    const entrypointsJson = entrypoints.reduce((json, entrypoint) => {
        const extname = path.extname(entrypoint);
        const basename = path.basename(entrypoint, extname);
        const loader = loaders[extname] || 'tsx';
        const map = json[basename] = json[basename] || {
            format,
            js: [],
            css: [],
        };
        const outputFile = new URL(path.relative(config.rootDir, entrypoint), base).href;

        switch (loader) {
            case 'css': {
                map.css.push(outputFile);
                break;
            }
            default: {
                map.js.push(outputFile);
                if (webSocketImport && !map.js.includes(webSocketImport)) {
                    map.js.unshift(webSocketImport);
                }
                break;
            }
        }

        return json;
    }, /** @type {{[file: string]: { js: string[], css: string[] }}} */ ({}));

    await writeFile(outputFile, JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}
