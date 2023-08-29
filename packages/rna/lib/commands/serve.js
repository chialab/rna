import path from 'path';
import process from 'process';
import { colors } from '@chialab/rna-logger';
import { serve, loadDevServerConfig } from '@chialab/rna-dev-server';

/**
 * @typedef {Object} DevServerCoreConfig
 * @property {import('@chialab/rna-logger').Logger} [logger]
 * @property {import('@chialab/rna-config-loader').EntrypointConfig[]} [entrypoints]
 * @property {string} [manifestPath]
 * @property {string} [entrypointsPath]
 * @property {Record<string, string>} [alias]
 * @property {import('esbuild').Plugin[]} [transformPlugins]
 * @property {string | string[]} [target]
 * @property {'transform'|'preserve'|'automatic'} [jsx]
 * @property {string} [jsxImportSource]
 * @property {string} [jsxFactory]
 * @property {string} [jsxFragment]
 */

/**
 * @typedef {Partial<import('@chialab/es-dev-server').DevServerCoreConfig> & DevServerCoreConfig} DevServerConfig
 */

/**
 * @typedef {Object} ServeCommandOptions
 * @property {number} [port]
 * @property {string} [config]
 * @property {boolean|string} [manifest]
 * @property {boolean|string} [entrypoints]
 * @property {string} [target]
 * @property {'transform'|'preserve'|'automatic'} [jsx]
 * @property {string} [jsxImportSource]
 * @property {string} [jsxFactory]
 * @property {string} [jsxFragment]
 */

/**
 * @param {import('commander').Command} program
 */
export default function(program) {
    program
        .command('serve [root]')
        .description('Start a web dev server (https://modern-web.dev/docs/dev-server/overview/) that transforms ESM imports for node resolution on demand. It also uses esbuild (https://esbuild.github.io/) to compile non standard JavaScript syntax.')
        .option('-P, --port <number>', 'server port number', parseInt)
        .option('-C, --config <path>', 'the rna config file')
        .option('--manifest <path>', 'generate manifest file')
        .option('--entrypoints <path>', 'generate entrypoints file')
        .option('--target <query>', 'output targets (es5, es2015, es2020)')
        .option('--jsx <mode>', 'jsx transform mode')
        .option('--jsxFactory <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('--jsxImportSource <name>', 'jsx module name')
        .action(
            /**
             * @param {string} root
             * @param {ServeCommandOptions} options
             */
            async (root = process.cwd(), options) => {
                const {
                    port,
                    target,
                    jsx,
                    jsxImportSource,
                    jsxFactory,
                    jsxFragment,
                } = options;

                const manifestPath = options.manifest ? (typeof options.manifest === 'string' ? options.manifest : path.join(root, 'manifest.json')) : undefined;
                const entrypointsPath = options.entrypoints ? (typeof options.entrypoints === 'string' ? options.entrypoints : path.join(root, 'entrypoints.json')) : undefined;
                const serveConfig = await loadDevServerConfig({
                    rootDir: root,
                    port,
                    manifestPath,
                    entrypointsPath,
                    target,
                    jsx,
                    jsxImportSource,
                    jsxFactory,
                    jsxFragment,
                }, options.config);

                const server = await serve(serveConfig);

                serveConfig.logger?.log(`
${colors.bold('dev server started!')}

root:     ${colors.hex('#ef7d00')(path.resolve(serveConfig.rootDir || root))}
local:    ${colors.hex('#ef7d00')(`http://${server.config.hostname}:${server.config.port}/`)}
`);
            }
        );
}
