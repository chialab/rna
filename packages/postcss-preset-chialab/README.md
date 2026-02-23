# Postcss Preset Chialab

The [postcss](https://postcss.org/) preset used by Chialab.

[![NPM](https://img.shields.io/npm/v/@chialab/postcss-preset-chialab.svg)](https://www.npmjs.com/package/@chialab/postcss-preset-chialab)

## Plugins

- [autoprefixer](https://preview.npmjs.com/package/autoprefixer)
- [postcss-all-unset](https://preview.npmjs.com/package/postcss-all-unset)
- [postcss-custom-properties](https://preview.npmjs.com/package/postcss-custom-properties)
- [postcss-focus-visible](https://preview.npmjs.com/package/postcss-focus-visible)
- [postcss-focus-within](https://preview.npmjs.com/package/postcss-focus-within)

## Install

```sh
npm i @chialab/postcss-preset-chialab -D
```

```sh
yarn add @chialab/postcss-preset-chialab -D
```

```sh
pnpm add @chialab/postcss-preset-chialab -D
```

## Usage

```js
import postcss from 'postcss';
import chialabPreset from '@chialab/postcss-preset-chialab';

postcss([
    chialabPreset(),
]).process(...);
```

## License

**Postcss Preset Chialab** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/postcss-preset-chialab/LICENSE) license.
