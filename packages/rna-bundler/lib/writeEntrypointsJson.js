import path from 'path';
import { rm, mkdir, writeFile } from 'fs/promises';
import { loaders } from './loaders.js';

/**
 * @typedef {(entrypoint: string) => string} EntrypointResolveCallback
 */

/**
 * Map build entrypoints to entrypoints.json
 * @param {string[]} entrypoints The build entrypoints.
 * @param {EntrypointResolveCallback} resolve The resolution callback for the endpoint.
 * @param {import('@chialab/rna-config-loader').Format} format The output format.
 */
function mapEntrypoints(entrypoints, format = 'esm', resolve = (entrypoint) => entrypoint) {
    return entrypoints.reduce((json, entrypoint) => {
        const extname = path.extname(entrypoint);
        const basename = path.basename(entrypoint, extname);
        const loader = loaders[extname] || 'tsx';
        const map = json[basename] = json[basename] || {
            format,
            js: [],
            css: [],
        };

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
    }, /** @type {{[file: string]: { js: string[], css: string[] }}} */({}));
}

/**
 * Write entrypoints.json
 * @param {string[]} entrypoints The build entrypoints.
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} rootDir The root dir.
 * @param {string} outputFile The output file or dir.
 * @param {string} publicPath The public path.
 * @param {import('@chialab/rna-config-loader').Format} format The output format.
 */
export async function writeEntrypointsJson(entrypoints, result, rootDir, outputFile, publicPath = '/', format) {
    const { metafile } = result;
    if (!metafile) {
        return;
    }

    const { outputs } = metafile;
    const outputsByEntrypoint = Object.keys(outputs)
        .reduce((map, outputName) => {
            const output = outputs[outputName];
            if (!output.entryPoint) {
                return map;
            }
            map[path.resolve(rootDir, output.entryPoint)] = path.resolve(rootDir, outputName);

            return map;
        }, /** @type {{ [key: string]: string }} */({}));

    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    const entrypointsJson = mapEntrypoints(entrypoints, format, (entrypoint) =>
        path.join(publicPath, path.relative(outputDir, outputsByEntrypoint[path.resolve(rootDir, entrypoint)]))
    );

    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}


/**
 * Write entrypoints.json for dev server
 * @param {string[]} entrypoints The build entrypoints.
 * @param {string} outputFile The output file or dir.
 * @param {import('@web/dev-server-core').DevServer} server The server instance.
 * @param {import('@chialab/rna-config-loader').Format} format The output format.
 */
export async function writeDevEntrypointsJson(entrypoints, outputFile, server, format) {
    const { config } = server;
    const base = `http${config.http2 ? 's' : ''}://${config.hostname ?? 'localhost'}:${config.port}`;
    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    const webSocketImport = server.webSockets && server.webSockets.webSocketImport && new URL(server.webSockets.webSocketImport, base).href;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    const entrypointsJson = mapEntrypoints(entrypoints, format, (entrypoint) =>
        new URL(path.relative(config.rootDir, entrypoint), base).href
    );

    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputFile, JSON.stringify({
        entrypoints: entrypointsJson,
        server: {
            origin: base,
            port: config.port,
            inject: [
                webSocketImport,
            ],
        },
    }, null, 2));
}
