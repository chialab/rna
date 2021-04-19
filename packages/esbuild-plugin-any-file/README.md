<p align="center">
    <strong>Esbuild Plugin Any File</strong> • A loader plugin for <a href="https://esbuild.github.io/">esbuild</a> for files with unknown loader.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-any-file"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-any-file.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-any-file -D
$ yarn add @chialab/esbuild-plugin-any-file -D
```

## Usage

```js
import esbuild from 'esbuild';
import { filePlugin } from '@chialab/esbuild-plugin-any-file';

await esbuild.build({
    plugins: [
        filePlugin(),
    ],
});
```

---

## License

**Esbuild Plugin Any File** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-any-file/LICENSE) license.
