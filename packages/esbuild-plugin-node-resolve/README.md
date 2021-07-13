<p align="center">
    <strong>Esbuild Plugin Node Resolve</strong> • An <a href="https://esbuild.github.io/">esbuild</a> plugin that resolves and converts import statements using node resolution.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-node-resolve"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-node-resolve.svg?style=flat-square"></a>
</p>

---

## How it works

**Esbuild Plugin Node Resolve** transforms import and export statements to relative references.

**In**
```js
import 'lit';
```

**Out**
```js
import '../node_modules/lit/index.js';
```

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-node-resolve -D
$ yarn add @chialab/esbuild-plugin-node-resolve -D
```

## Usage

```js
import esbuild from 'esbuild';
import nodeResolvePlugin from '@chialab/esbuild-plugin-node-resolve';

await esbuild.build({
    plugins: [
        nodeResolvePlugin(),
    ],
});
```

---

## License

**Esbuild Plugin Node Resolve** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-node-resolve/LICENSE) license.
