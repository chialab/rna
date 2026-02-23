# Estransform

Execute multiple transformations on JavaScript sources with full sourcemaps support.

[![NPM](https://img.shields.io/npm/v/@chialab/estransform.svg)](https://www.npmjs.com/package/@chialab/estransform)

## Install

```sh
npm i @chialab/estransform -D
```

```sh
yarn add @chialab/estransform -D
```

```sh
pnpm add @chialab/estransform -D
```

## Usage

```js
import { parse } from '@chialab/estransform';

const { ast, helpers } = await transform('require("tslib"); module.exports = function() {}', {
    sourceContents: true,
});

helpers.overwrite(0, contents.length, 'Hello!');
```

## License

**Estransform** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/estransform/LICENSE) license.
