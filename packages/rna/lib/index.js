#!/usr/bin/env node
import { readFile } from 'fs/promises';
import process from 'process';
import { program } from 'commander';
import registerBuildCommand from './commands/build.js';

const argv = process.argv;
const packageJson = new URL('../package.json', import.meta.url);
const json = JSON.parse(await readFile(packageJson, 'utf-8'));

registerBuildCommand(program);
program.version(json.version);
program.parse(argv);
