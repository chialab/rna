#!/usr/bin/env node

import path from 'path';
import { promises } from 'fs';
import commander from 'commander';

const { readFile } = promises;

(async () => {
    let { program } = commander;
    let packageJson = new URL('../package.json', import.meta.url);
    let json = JSON.parse(await readFile(packageJson, 'utf-8'));

    program
        .version(json.version);

    program
        .command('build <entry...>', { isDefault: true })
        .description('Compile JS and CSS modules using esbuild (https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.')
        .option('-O, --output <path>', 'output directory or file')
        .option('-F, --format <type>', 'bundle format')
        .option('-P, --platform <type>', 'platform destination')
        .option('-B, --bundle', 'bundle dependencies')
        .option('-M, --minify', 'minify the build')
        .option('-W, --watch', 'keep build alive')
        .option('-P, --public <path>', 'public path')
        .option('-T, --target <query>', 'browserslist targets')
        .option('-E, --entryNames <pattern>', 'output file names')
        .option('-C, --clean', 'cleanup output path')
        .option('-J, --metafile [path]', 'generate manifest and endpoints maps')
        .option('-N, --name <identifier>', 'the iife global name')
        .option('--external [modules]', 'comma separated external packages')
        .option('--no-map', 'do not generate sourcemaps')
        .option('--jsxPragma <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('--jsxModule <name>', 'jsx module name')
        .option('--jsxExport <type>', 'jsx export mode')
        .action(
            /**
             * @param {string[]} input
             * @param {{ output: string, format?: import('esbuild').Format, platform: import('esbuild').Platform, bundle?: boolean, minify?: boolean, name?: string, watch?: boolean, metafile?: boolean, target?: string, public?: string, entryNames?: string, clean?: boolean, external?: string, map?: boolean, jsxPragma?: string, jsxFragment?: string, jsxModule?: string, jsxExport?: 'named'|'namespace'|'default' }} options
             */
            async (input, { output, format = 'esm', platform, bundle, minify, name, watch, metafile, target, public: publicPath, entryNames, clean, external, map, jsxPragma, jsxFragment, jsxModule, jsxExport }) => {
                const { build } = await import('@chialab/rna-bundler');
                const plugins = [];
                const babelPlugin = await (async () => {
                    try {
                        return (await import('@chialab/esbuild-plugin-swc')).default;
                    } catch(err) {
                        //
                    }
                    try {
                        return (await import('@chialab/esbuild-plugin-babel')).default;
                    } catch(err) {
                        //
                    }
                })();

                if (babelPlugin) {
                    plugins.push(babelPlugin);
                }

                await build({
                    input: input.map((entry) => path.resolve(entry)),
                    output: path.resolve(output),
                    format,
                    platform,
                    name,
                    bundle,
                    minify,
                    target,
                    clean,
                    watch,
                    metafile,
                    external: external ? external.split(',') : undefined,
                    publicPath: publicPath ? path.resolve(publicPath) : undefined,
                    entryNames,
                    sourcemap: map,
                    jsx: jsxPragma ? {
                        pragma: jsxPragma,
                        pragmaFrag: jsxFragment,
                        import: jsxModule ? {
                            module: jsxModule,
                            export: jsxExport,
                        } : undefined,
                    } : undefined,
                    plugins,
                });
            }
        );

    program
        .command('serve [root]')
        .description('Start a web dev server (https://modern-web.dev/docs/dev-server/overview/) that transforms ESM imports for node resolution on demand. It also uses esbuild (https://esbuild.github.io/) to compile non standard JavaScript syntax.')
        .option('-P, --port <number>', 'server port number')
        .option('-M, --metafile [path]', 'generate manifest and endpoints maps')
        .option('-E, --entrypoints <entry...>', 'list of server entrypoints')
        .action(
            /**
             * @param {string} rootDir
             * @param {{ port?: string, metafile?: boolean, entrypoints?: string[] }} options
             */
            async (rootDir, { port, metafile, entrypoints = [] }) => {
                const { serve } = await import('@chialab/rna-web-server');

                await serve({
                    rootDir: rootDir ? rootDir : undefined,
                    port: port ? parseInt(port) : undefined,
                    metafile,
                    entryPoints: entrypoints.map((entry) => path.resolve(entry)),
                });
            }
        );

    program
        .command('test [specs...]')
        .description('Start a browser test runner (https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses mocha (https://mochajs.org/) but you still need to import an assertion library (recommended https://open-wc.org/docs/testing/testing-package/).')
        .option('-W, --watch', 'watch test files')
        .option('-C, --coverage', 'add coverage to tests')
        .option('-O, --open', 'open the browser')
        .action(
            /**
             * @param {string[]} specs
             * @param {{ watch?: boolean, coverage?: boolean, open?: boolean }} options
             */
            async (specs, { watch, coverage, open }) => {
                const { test } = await import('@chialab/rna-browser-test-runner');

                /**
                 * @type {Partial<import('@web/test-runner').TestRunnerConfig>}
                 */
                let config = {
                    watch,
                    coverage,
                    open,
                    manual: open ? true : undefined,
                };
                if (specs.length) {
                    config.files = specs;
                }
                await test(config);
            }
        );

    program
        .parse(process.argv);
})();
