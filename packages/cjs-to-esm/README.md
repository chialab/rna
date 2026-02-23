# CommonJS to ESM

A commonjs to esm converter, inspired by [WMR](https://github.com/preactjs/wmr).

[![NPM](https://img.shields.io/npm/v/@chialab/cjs-to-esm.svg)](https://www.npmjs.com/package/@chialab/cjs-to-esm)

## Install

```sh
npm i @chialab/cjs-to-esm -D
```

```sh
yarn add @chialab/cjs-to-esm -D
```

```sh
pnpm add @chialab/cjs-to-esm -D
```

## Usage

```js
import { transform } from '@chialab/cjs-to-esm';

const { code, map } = transform('require("tslib"); module.exports = function() {}');
```

## License

**CommonJS to ESM** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/cjs-to-esm/LICENSE) license.
