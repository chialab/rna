# RNA

A bundler, a server and a test runner based on esbuild for modern modules and applications.

> ⚠️ This is an experimantal faster version of the RNA bundler, some features are still missing and some others won't be replicated.

## Install

```sh
$ npm i @chialab/rna -D
$ yarn add @chialab/rna -D
```

## Usage

Single run:

```js
const { build } = require('@chialab/rna');

build({
    input: 'index.js',
    output: 'dist/esm/index.js',
    code: '...', // optional if input exists
    root: './', // optional, default process.cwd
    format: 'esm', // or 'cjs', 'iife'
    platform: 'browser' // or 'node',
    name = '...',
    jsx: { // optional
        pragma: 'h',
        pragmaFrag: 'Fragment',
    },
    targets: 'last 2 versions', // optional
    sourcemap: true,
    minify: true,
}).then(...).catch(...);
```
