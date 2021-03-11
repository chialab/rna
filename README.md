# FastRNA

A bundler based on esbuild for modern modules and applications.

> ⚠️ This is an experimantal faster version of the RNA bundler, some features are still missing and some others are ignored by design.

## Install

```sh
$ npm i git+ssh://git@gitlab.com/chialab/fast-rna.git
$ yarn add git+ssh://git@gitlab.com/chialab/fast-rna.git
```

## Usage

Single run:

```js
const { build } = require('@chialab/fast-rna');

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
