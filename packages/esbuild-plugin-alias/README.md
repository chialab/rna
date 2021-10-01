<p align="center">
    <strong>Esbuild Plugin Alias</strong> • A plugin for <a href="https://esbuild.github.io/">esbuild</a> that resolves aliases or empty modules.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-alias"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-alias.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-alias -D
$ yarn add @chialab/esbuild-plugin-alias -D
```

## Usage

```js
import esbuild from 'esbuild';
import aliasPlugin from '@chialab/esbuild-plugin-alias';

await esbuild.build({
    plugins: [
        aliasPlugin({
            'node-fetch': false,
            'path': '../path-browser.js'
        }),
    ],
});
```

---

## License

**Esbuild Plugin alias** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-alias/LICENSE) license.
