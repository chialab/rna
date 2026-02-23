#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { colors, createLogger } from '@chialab/rna-logger';
import { program } from 'commander';

const argv = process.argv;
const packageJson = new URL('../package.json', import.meta.url);
const json = JSON.parse(await readFile(packageJson, 'utf-8'));

program.version(json.version);

/**
 * @typedef {(program: import('commander').Command) => void} CommandLoader
 */

/**
 * @param {string} name
 * @param {string} sourceModule
 * @param {() => Promise<CommandLoader>} importer
 */
const loadCommand = async (name, sourceModule, importer) => {
    try {
        const command = await importer();
        command(program);
    } catch (err) {
        if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ERR_MODULE_NOT_FOUND') {
            const logger = createLogger();
            return program
                .command(name)
                .allowUnknownOption()
                .action(() => {
                    logger.error(colors.red(colors.bold('Command not found.')));
                    logger.error(`
${colors.yellow('Please install the corresponding module in order to use this command:')}
${colors.white(`npm install -D ${colors.hex('#ef7d00')(sourceModule)}`)}
${colors.white(`yarn add -D ${colors.hex('#ef7d00')(sourceModule)}`)}
`);

                    process.exitCode = 1;
                });
        }

        throw err;
    }
};

/**
 * @type {Record<string, [string, () => Promise<CommandLoader>]>}
 */
const commands = {
    build: ['@chialab/rna-bundler', () => import('./commands/build.js').then((mod) => mod.default)],
    serve: ['@chialab/rna-dev-server', () => import('./commands/serve.js').then((mod) => mod.default)],
};

const command = /** @type {keyof typeof commands} */ (argv[2]);
if (commands[command]) {
    const [sourceModule, importer] = commands[command];
    await loadCommand(command, sourceModule, importer);
}

program.parse(argv);
