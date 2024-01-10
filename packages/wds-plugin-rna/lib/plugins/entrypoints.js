import path from 'path';
import { rm, mkdir, writeFile } from 'fs/promises';
import { generateEntrypointsJson } from '@chialab/esbuild-plugin-metadata';

/**
 * Write entrypoints.json for dev server
 * @param {string[]} entrypoints The build entrypoints.
 * @param {string} outputFile The output file or dir.
 * @param {import('@web/dev-server-core').ServerStartParams} server The server instance.
 * @param {Record<string, import('esbuild').Loader>} loaders The build loaders.
 * @param {import('esbuild').Format} format The output format.
 */
export async function writeDevEntrypointsJson(entrypoints, outputFile, server, loaders, format) {
    const { config } = server;
    const base = `http${config.http2 ? 's' : ''}://${config.hostname ?? 'localhost'}:${config.port}`;
    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    const webSocketImport = server.webSockets && server.webSockets.webSocketImport && new URL(server.webSockets.webSocketImport, base).href;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    const entrypointsJson = generateEntrypointsJson(entrypoints, loaders, format, (entrypoint) =>
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

/**
 * @typedef {{ entrypoints: import('@chialab/rna-config-loader').EntrypointConfig[]; loaders?: Record<string, import('esbuild').Loader> }} EntrypointPluginOptions
 */

/**
 * @param {EntrypointPluginOptions} options
 */
export function entrypointsPlugin(options) {
    const {
        entrypoints,
        loaders = {
            '.cjs': 'tsx',
            '.mjs': 'tsx',
            '.js': 'tsx',
            '.jsx': 'tsx',
            '.ts': 'ts',
            '.tsx': 'tsx',
            '.json': 'json',
            '.geojson': 'json',
            '.css': 'css',
            '.scss': 'css',
            '.sass': 'css',
        },
    } = options;

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'rna-entrypoints',

        async serverStart(serverStartParams) {
            if (entrypoints) {
                await Promise.all(
                    entrypoints.map(async ({ input, entrypointsPath }) => {
                        if (!entrypointsPath) {
                            return;
                        }

                        const files = Array.isArray(input) ? input : [input];
                        await writeDevEntrypointsJson(files, entrypointsPath, serverStartParams, loaders, 'esm');
                    })
                );
            }
        },
    };

    return plugin;
}
