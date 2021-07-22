<p align="center">
    <strong>Esbuild Plugin SWC</strong> • A pluggable <a href="https://esbuild.github.io/">esbuild</a> plugin that runs <a href="https://swc.rs/">swc</a> for es5 transpilation.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-swc"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-swc.svg?style=flat-square"></a>
</p>

> ⚠️ The development of this plugin has been suspended for maintenance reasons after an initial trial period. Developments will follow when the swc project will be more stable.

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-swc -D
$ yarn add @chialab/esbuild-plugin-swc -D
```

## Usage

```js
import esbuild from 'esbuild';
import swcPlugin from '@chialab/esbuild-plugin-swc';

await esbuild.build({
    plugins: [
        swcPlugin({
            plugins: [...],
        }),
    ],
});
```

---

## License

**Esbuild Plugin SWC** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-swc/LICENSE) license.
