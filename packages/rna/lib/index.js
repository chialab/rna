#!/usr/bin/env node

import { readFile } from 'fs/promises';
import commander from 'commander';
import { createLogger, colors } from '@chialab/rna-logger';

(async () => {
    const { program } = commander;
    const packageJson = new URL('../package.json', import.meta.url);
    const json = JSON.parse(await readFile(packageJson, 'utf-8'));

    program
        .version(json.version);

    /**
     * @param {string} name
     * @param {string} source
     */
    const loadCommand = async function(name, source) {
        try {
            const { command } = await import(source);
            command(program);
        } catch (err) {
            if ((/** @type {NodeJS.ErrnoException} */(err)).code === 'ERR_MODULE_NOT_FOUND') {
                const logger = createLogger();
                return program
                    .command(name)
                    .allowUnknownOption()
                    .action(() => {
                        logger.error(colors.red(colors.bold('Command not found.')));
                        logger.error(`
${colors.yellow('Please install the corresponding module in order to use this command:')}
${colors.white(`npm install -D ${colors.blue(source)}`)}
${colors.white(`yarn add -D ${colors.blue(source)}`)}
`);

                        process.exitCode = 1;
                    });
            }

            throw err;
        }
    };

    await Promise.all([
        loadCommand('build', '@chialab/rna-bundler'),
        loadCommand('serve', '@chialab/rna-dev-server'),
        loadCommand('test:browser', '@chialab/rna-browser-test-runner'),
        loadCommand('test:node', '@chialab/rna-node-test-runner'),
        loadCommand('test:saucelabs', '@chialab/rna-saucelabs-test-runner'),
        loadCommand('apidoc', '@chialab/rna-apidoc'),
    ]);

    program
        .parse(process.argv);
})();
