# Esbuild Plugin Lightning CSS

A CSS loader plugin for [esbuild](https://esbuild.github.io/) that uses [Lightning CSS](https://lightningcss.dev/) as preprocessor.

[![NPM](https://img.shields.io/npm/v/@chialab/esbuild-plugin-lightningcss.svg)](https://www.npmjs.com/package/@chialab/esbuild-plugin-lightningcss)

## Install

```sh
npm i @chialab/esbuild-plugin-lightningcss -D
```

```sh
yarn add @chialab/esbuild-plugin-lightningcss -D
```

## Usage

```js
import lightningcssPlugin from '@chialab/esbuild-plugin-lightningcss';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [lightningcssPlugin()],
});
```

## License

**Esbuild Plugin Lightning CSS** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-lightningcss/LICENSE) license.
