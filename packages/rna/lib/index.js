#!/usr/bin/env node

import { promises } from 'fs';
import commander from 'commander';

const { readFile } = promises;

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
            program
                .command(name)
                .allowUnknownOption()
                .action(() => {
                    throw new Error(`Command not installed, please run:\n\nnpm install ${source} -D\nyarn add ${source} -D\n`);
                });
        }
    };

    await Promise.all([
        await loadCommand('build', '@chialab/rna-bundler'),
        await loadCommand('serve', '@chialab/rna-web-server'),
        await loadCommand('test:browser', '@chialab/rna-browser-test-runner'),
        await loadCommand('test:node', '@chialab/rna-node-test-runner'),
    ]);

    program
        .parse(process.argv);
})();
