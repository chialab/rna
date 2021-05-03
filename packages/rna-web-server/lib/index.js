import path from 'path';
import { promises } from 'fs';

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
    const { hmrCssPlugin } = await import('@chialab/wds-plugin-hmr-css');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { commonjsPlugin } = await import('@chialab/wds-plugin-commonjs');
    const { default: cors } = await import('@koa/cors');
    const { cssPlugin } = await import('@chialab/wds-plugin-postcss');
    const { defineEnvVariables } = await import('@chialab/esbuild-plugin-env');

    let root = config.rootDir || process.cwd();
    let appIndex = path.join(root, 'index.html');
    let index = false;
    try {
        index = (await stat(appIndex)).isFile();
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
            appIndex: index ? appIndex : undefined,
            nodeResolve: {
                exportConditions: ['default', 'module', 'import'],
                mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'main'],
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
                        '.cjs': 'tsx',
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
                    target: 'auto-always',
                }),
                commonjsPlugin(),
                hmrPlugin(),
                hmrCssPlugin(),
                ...(config.plugins || []),
            ],
        },
    });

    if (config.metafile) {
        const { saveDevEndpointsJson } = await import('@chialab/rna-bundler');
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
