<p align="center">
    <strong>Esbuild Plugin Require Resolve</strong> • A file loader plugin for <a href="https://esbuild.github.io/">esbuild</a> for `require.resolve` statements.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-require-resolve"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-require-resolve.svg?style=flat-square"></a>
</p>

> ⚠️ The development of this plugin has been abandoned for design reasons.

---

## How it works

**Esbuild Plugin Require Resolve** looks for `require.resolve('path/to/file.png')` statements in JavaScript and TypeScript files and instructs esbuild to copy referenced files.

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-require-resolve -D
$ yarn add @chialab/esbuild-plugin-require-resolve -D
```

## Usage

```js
import esbuild from 'esbuild';
import requireResolvePlugin from '@chialab/esbuild-plugin-require-resolve';

await esbuild.build({
    plugins: [
        requireResolvePlugin(),
    ],
});
```

---

## License

**Esbuild Plugin Require Resolve** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-require-resolve/LICENSE) license.
