import path from 'path';
import { promises } from 'fs';
import { saveDevEndpointsJson } from '@chialab/rna-bundler';

const { stat } = promises;

/**
 * @typedef {import('@web/dev-server').DevServerConfig & { metafile?: boolean|string, entryPoints?: string[] }} DevServerConfig
 */

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @return {Promise<import('@web/dev-server-core').DevServer>} The dev server instance.
 */
export async function serve(config) {
    const { startDevServer } = await import('@web/dev-server');
    const { hmrPlugin } = await import('@web/dev-server-hmr');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { fromRollup } = await import('@web/dev-server-rollup');
    const { default: rollupCommonjs } = await import('@rollup/plugin-commonjs');
    const { default: cors } = await import('@koa/cors');
    const { cssPlugin } = await import('@chialab/wds-plugin-postcss');
    const { defineEnvVariables } = await import('@chialab/esbuild-plugin-env');
    const commonjsPlugin = fromRollup(rollupCommonjs);

    let root = config.rootDir || process.cwd();
    let index = false;
    try {
        index = (await stat(path.join(root, 'index.html'))).isFile();
    } catch {
        //
    }

    let server = await startDevServer({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        config: {
            port: 8080,
            appIndex: index ? 'index.html' : undefined,
            nodeResolve: {
                exportConditions: ['default', 'module', 'import'],
                mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            watch: true,
            clearTerminalOnReload: true,
            open: false,
            ...config,
            rootDir: root,
            middleware: [
                cors(),
            ],
            plugins: [
                cssPlugin(),
                esbuildPlugin({
                    loaders: {
                        '.mjs': 'tsx',
                        '.js': 'tsx',
                        '.jsx': 'tsx',
                        '.ts': 'tsx',
                        '.tsx': 'tsx',
                        '.json': 'json',
                        '.geojson': 'json',
                    },
                    define: {
                        ...defineEnvVariables(),
                    },
                }),
                commonjsPlugin({
                    ignoreTryCatch: true,
                    exclude: [
                        'node_modules/chai/chai.js',
                        'node_modules/chai-dom/chai-dom.js',
                    ],
                }),
                hmrPlugin(),
                ...(config.plugins || []),
            ],
        },
    });

    if (config.metafile) {
        let metaDir;
        if (typeof config.metafile === 'string') {
            metaDir = config.metafile;
        } else {
            metaDir = config.rootDir || process.cwd();
        }

        await saveDevEndpointsJson(config.entryPoints || [], metaDir, server, {
            format: 'esm',
        });
    }

    return server;
}
