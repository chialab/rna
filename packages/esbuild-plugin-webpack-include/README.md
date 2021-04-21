<p align="center">
    <strong>Esbuild Plugin Webpack Include</strong> • A plugin for <a href="https://esbuild.github.io/">esbuild</a> that converts the `webpackInclude` syntax.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-webpack-include"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-webpack-include.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-webpack-include -D
$ yarn add @chialab/esbuild-plugin-webpack-include -D
```

## Usage

```js
import esbuild from 'esbuild';
import webpackIncludePlugin from '@chialab/esbuild-plugin-webpack-include';

await esbuild.build({
    plugins: [
        webpackIncludePlugin(),
    ],
});
```

---

## License

**Esbuild Plugin Webpack Include** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-webpack-include/LICENSE) license.
