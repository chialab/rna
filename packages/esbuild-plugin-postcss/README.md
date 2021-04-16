<p align="center">
    <strong>Esbuild Plugin Postcss</strong> • A CSS loader plugin for <a href="https://esbuild.github.io/">esbuild</a> that uses <a href="https://postcss.org/">postcss</a> as preprocessor.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-postcss"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-postcss.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-postcss -D
$ yarn add @chialab/esbuild-plugin-postcss -D
```

## Usage

```js
import esbuild from 'esbuild';
import { envPlugin } from '@chialab/esbuild-plugin-postcss';

await esbuild.build({
    plugins: [
        envPlugin(),
    ],
});
```

This plugin looks for a postcss configuration in the project and fallbacks to out custom [preset](https://www.npmjs.com/package/@chialab/postcss-preset-chialab).

---

## License

**Esbuild Plugin Postcss** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-postcss/LICENSE) license.
