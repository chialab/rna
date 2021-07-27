#!/usr/bin/env node

import { readFile } from 'fs/promises';
import commander from 'commander';

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
            if (err.code === 'ERR_MODULE_NOT_FOUND') {
                return program
                    .command(name)
                    .allowUnknownOption()
                    .action(() => {
                        throw new Error(`Command not installed, please run:\n\nnpm install ${source} -D\nyarn add ${source} -D\n`);
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
