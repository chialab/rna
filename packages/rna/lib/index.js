#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { program } from 'commander';
import { createLogger, colors } from '@chialab/rna-logger';
import process from 'process';

const argv = process.argv;
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
${colors.white(`npm install -D ${colors.hex('#ef7d00')(source)}`)}
${colors.white(`yarn add -D ${colors.hex('#ef7d00')(source)}`)}
`);

                    process.exitCode = 1;
                });
        }

        throw err;
    }
};

const commands = {
    'build': '@chialab/rna-bundler',
    'serve': '@chialab/rna-dev-server',
    'test:browser': '@chialab/rna-browser-test-runner',
    'test:node': '@chialab/rna-node-test-runner',
    'test:saucelabs': '@chialab/rna-saucelabs-test-runner',
};

const command = /** @type {keyof typeof commands} */ (argv[2]);
if (commands[command]) {
    await loadCommand(command, commands[command]);
} else {
    await Promise.all(Object.keys(commands).map(
        (key) => loadCommand(key, commands[(/** @type {keyof typeof commands} key */ (key))])
    ));
}

program
    .parse(argv);
