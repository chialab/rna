<p align="center">
    <strong>esbuild-plugin-virtual</strong> • A virtual file system for ebuild modules.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-virtual"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-virtual.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-virtual -D
$ yarn add @chialab/esbuild-plugin-virtual -D
```

## Usage

Define a virtual module:

```js
import esbuild from 'esbuild';
import virtualPlugin from '@chialab/esbuild-plugin-virtual';

await esbuild.build({
    entrypoints: [
        'index.js',
    ],
    plugins: [
        virtualPlugin([
            {
                path: 'virtual-entry.js',
                contents: 'export const nil = () => {};',
                loader: 'js',
            },
        ]),
    ],
});
```

**index.js**

```js
import { nil } from 'virtual-entry.js';

nil();
```

---

## License

**esbuild-plugin-virtual** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-virtual/LICENSE) license.
