#!/usr/bin/env node

import path from 'path';
import { promises } from 'fs';
import { program } from 'commander';

const { readFile } = promises;

(async () => {
    let packageJson = new URL('./package.json', import.meta.url);
    let json = JSON.parse(await readFile(packageJson, 'utf-8'));

    program
        .version(json.version);

    program
        .command('build <entry>', { isDefault: true })
        .description('build an entry')
        .option('-O, --output <path>', 'output directory or file')
        .option('-F, --format <type>', 'bundle format')
        .option('-B, --bundle', 'bundle dependencies')
        .option('-M, --minify', 'minify the build')
        .action(async (input, { output, format = 'esm', bundle, minify, name }) => {
            const { build } = require('./lib/index');
            await build({
                input: path.resolve(input),
                output: path.resolve(output),
                format,
                name,
                bundle,
                minify,
                sourcemap: true,
            });
        });

    program
        .command('serve [root]')
        .description('start the dev server')
        .option('-P, --port <number>', 'server port number')
        .action(async (root, { port }) => {
            const { serve } = require('./lib/index');
            /**
             * @type {Partial<import('@web/dev-server').DevServerConfig>}
             */
            let config = {
                port,
            };
            if (root) {
                config.rootDir = root;
            }
            await serve(config);
        });

    program
        .command('test <specs>')
        .description('start the test runner')
        .option('-W, --watch', 'watch test files')
        .option('-C, --coverage', 'add coverage to tests')
        .action(async (input, { watch, coverage }) => {
            const { test } = require('./lib/index');
            /**
             * @type {Partial<import('@web/test-runner').TestRunnerConfig>}
             */
            let config = {
                watch,
                coverage,
            };
            if (input) {
                config.files = [input];
            }
            await test(config);
        });

    program
        .parse(process.argv);

})();
