#!/usr/bin/env node

import path from 'path';
import { promises } from 'fs';
import commander from 'commander';

const { readFile } = promises;

(async () => {
    let { program } = commander;
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
            const { build } = await import('./lib/index.js');
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
        .command('serve [base]')
        .description('start the dev server')
        .option('-P, --port <number>', 'server port number')
        .option('-I, --index <path>', 'base index.html path')
        .action(async (root, { port, index }) => {
            const { serve } = await import('./lib/index.js');
            await serve({
                port: port ? parseInt(port) : undefined,
                appIndex: index ? path.resolve(index) : undefined,
                rootDir: root,
            });
        });

    program
        .command('test <specs>')
        .description('start the test runner')
        .option('-W, --watch', 'watch test files')
        .option('-C, --coverage', 'add coverage to tests')
        .option('-O, --open', 'open the browser')
        .action(async (input, { watch, coverage, open }) => {
            const { test } = await import('./lib/index.js');
            /**
             * @type {Partial<import('@web/test-runner').TestRunnerConfig>}
             */
            let config = {
                watch,
                coverage,
                open,
                manual: open ? true : undefined,
            };
            if (input) {
                config.files = [input];
            }
            await test(config);
        });

    program
        .parse(process.argv);

})();
