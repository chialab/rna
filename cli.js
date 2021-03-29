#!/usr/bin/env node

const path = require('path');
const { program } = require('commander');

program
    .version(require('./package.json').version);

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
    .action(async (root) => {
        const { serve } = require('./lib/index');
        let config = {};
        if (root) {
            config.root = root;
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
