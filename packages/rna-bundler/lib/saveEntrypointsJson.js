import path from 'path';
import { promises } from 'fs';
import { loaders } from './loaders.js';

const { writeFile } = promises;

/**
 * Write entrypoints.json
 * @param {string[]} entrypoints The build entrypoints.
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} rootDir The root dir.
 * @param {string} outputFile The output file or dir.
 * @param {string} publicPath The public path.
 * @param {Object} extras Extra metadata, such as bundle format.
 */
export async function saveEntrypointsJson(entrypoints, result, rootDir, outputFile, publicPath = '/', extras = {}) {
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

    /**
     * @type {{[file: string]: { js?: string[], css?: string[] }}}
     */
    const entrypointsJson = {};
    entrypoints.forEach((entrypoint) => {
        const extname = path.extname(entrypoint);
        const basename = path.basename(entrypoint, extname);
        const loader = loaders[extname] || 'tsx';
        const map = entrypointsJson[basename] = entrypointsJson[basename] || {};
        Object.assign(map, extras);
        switch (loader) {
            case 'css': {
                const list = map['css'] = map['css'] || [];
                list.push(`${publicPath.replace(/\/+$/, '')}/${path.relative(outputDir, outputsByEntrypoint[entrypoint])}`);
                break;
            }
            default: {
                const list = map['js'] = map['js'] || [];
                list.push(`${publicPath.replace(/\/+$/, '')}/${path.relative(outputDir, outputsByEntrypoint[entrypoint])}`);
                break;
            }
        }
    });
    await writeFile(outputFile, JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}


/**
 * Write entrypoints.json for dev server
 * @param {string[]} entrypoints The build entrypoints.
 * @param {string} outputFile The output file or dir.
 * @param {import('@web/dev-server-core').DevServer} server The server instance.
 * @param {Object} extras Extra metadata, such as bundle format.
 */
export async function saveDevEntrypointsJson(entrypoints, outputFile, server, extras = {}) {
    const { config } = server;
    const base = `http${config.http2 ? 's' : ''}://${config.hostname ?? 'localhost'}:${config.port}`;
    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    /**
     * @type {{[file: string]: { js?: string[], css?: string[] }}}
     */
    const entrypointsJson = {};
    entrypoints.forEach((entrypoint) => {
        const extname = path.extname(entrypoint);
        const basename = path.basename(entrypoint, extname);
        const loader = loaders[extname] || 'tsx';
        const map = entrypointsJson[basename] = entrypointsJson[basename] || {};
        Object.assign(map, extras);
        switch (loader) {
            case 'css': {
                const list = map['css'] = map['css'] || [];
                list.push(`${base}/${path.relative(config.rootDir, entrypoint)}`);
                break;
            }
            default: {
                const list = map['js'] = map['js'] || [];
                list.push(`${base}/${path.relative(config.rootDir, entrypoint)}`);
                if (server.webSockets && server.webSockets.webSocketImport && !list.includes(`${base}${server.webSockets.webSocketImport}`)) {
                    list.unshift(`${base}${server.webSockets.webSocketImport}`);
                }
                break;
            }
        }
    });
    await writeFile(outputFile, JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}
