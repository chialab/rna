import path from 'path';
import { promises } from 'fs';
import { loaders } from './loaders.js';

const { writeFile } = promises;

/**
 * Write endpoints.json
 * @param {string[]} entrypoints The build entrypoints.
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} rootDir The root dir.
 * @param {string} outputDir The output dir.
 * @param {string} publicDir The public dir.
 * @param {Object} extras Extra metadata, such as bundle format.
 */
export async function saveEndpointsJson(entrypoints, result, rootDir, outputDir, publicDir = outputDir, extras = {}) {
    let { metafile } = result;
    if (!metafile) {
        return;
    }

    let { outputs } = metafile;
    let outputsByEntrypoint = Object.keys(outputs)
        .reduce((map, outputName) => {
            let output = outputs[outputName];
            if (!output.entryPoint) {
                return map;
            }
            map[path.resolve(rootDir, output.entryPoint)] = path.resolve(rootDir, outputName);

            return map;
        }, /** @type {{ [key: string]: string }} */ ({}));

    /**
     * @type {{[file: string]: { js?: string[], css?: string[] }}}
     */
    let entrypointsJson = {};
    entrypoints.forEach((entrypoint) => {
        let extname = path.extname(entrypoint);
        let basename = path.basename(entrypoint, extname);
        let loader = loaders[extname] || 'tsx';
        let map = entrypointsJson[basename] = entrypointsJson[basename] || {};
        Object.assign(map, extras);
        switch (loader) {
            case 'css': {
                let list = map['css'] = map['css'] || [];
                list.push(`/${path.relative(publicDir, outputsByEntrypoint[entrypoint])}`);
                break;
            }
            default: {
                let list = map['js'] = map['js'] || [];
                list.push(`/${path.relative(publicDir, outputsByEntrypoint[entrypoint])}`);
                break;
            }
        }
    });
    await writeFile(path.join(outputDir, 'entrypoints.json'), JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}


/**
 * Write endpoints.json for dev server
 * @param {string[]} entrypoints The build entrypoints.
 * @param {string} outputDir The output dir.
 * @param {import('@web/dev-server-core').DevServer} server The server instance.
 * @param {Object} extras Extra metadata, such as bundle format.
 */
export async function saveDevEndpointsJson(entrypoints, outputDir, server, extras = {}) {
    let { config } = server;
    let base = `http${config.http2 ? 's' : ''}://${config.hostname ?? 'localhost'}:${config.port}`;

    /**
     * @type {{[file: string]: { js?: string[], css?: string[] }}}
     */
    let entrypointsJson = {};
    entrypoints.forEach((entrypoint) => {
        let extname = path.extname(entrypoint);
        let basename = path.basename(entrypoint, extname);
        let loader = loaders[extname] || 'tsx';
        let map = entrypointsJson[basename] = entrypointsJson[basename] || {};
        Object.assign(map, extras);
        switch (loader) {
            case 'css': {
                let list = map['css'] = map['css'] || [];
                list.push(`${base}/${path.relative(config.rootDir, entrypoint)}`);
                break;
            }
            default: {
                let list = map['js'] = map['js'] || [];
                list.push(`${base}/${path.relative(config.rootDir, entrypoint)}`);
                if (server.webSockets && server.webSockets.webSocketImport && !list.includes(`${base}${server.webSockets.webSocketImport}`)) {
                    list.unshift(`${base}${server.webSockets.webSocketImport}`);
                }
                break;
            }
        }
    });
    await writeFile(path.join(outputDir, 'entrypoints.json'), JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}
