#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { program } from 'commander';
import process from 'process';
import registerBuildCommand from './commands/build.js';
import registerServeCommand from './commands/serve.js';
import registerTestNodeCommand from './commands/test-node.js';
import registerTestBrowserCommand from './commands/test-browser.js';
import registerTestSaucelabsCommand from './commands/test-saucelabs.js';

const packageJson = new URL('../package.json', import.meta.url);
const json = JSON.parse(await readFile(packageJson, 'utf-8'));

registerBuildCommand(program);
registerServeCommand(program);
registerTestNodeCommand(program);
registerTestBrowserCommand(program);
registerTestSaucelabsCommand(program);

program
    .version(json.version)
    .parse(process.argv);
