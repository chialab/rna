# Esbuild Plugin Unwebpack

A plugin for [esbuild](https://esbuild.github.io/) that removes webpack features from sources.

[![NPM](https://img.shields.io/npm/v/@chialab/esbuild-plugin-unwebpack.svg)](https://www.npmjs.com/package/@chialab/esbuild-plugin-unwebpack)

## Install

```sh
npm i @chialab/esbuild-plugin-unwebpack -D
```

```sh
yarn add @chialab/esbuild-plugin-unwebpack -D
```

```sh
pnpm add @chialab/esbuild-plugin-unwebpack -D
```

## Usage

```js
import unwebpackPlugin from '@chialab/esbuild-plugin-unwebpack';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [unwebpackPlugin()],
});
```

## License

**Esbuild Plugin Unwebpack** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-unwebpack/LICENSE) license.
