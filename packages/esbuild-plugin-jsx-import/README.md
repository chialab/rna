<p align="center">
    <strong>Esbuild Plugin JSX Import</strong> • Define all environement variables for <a href="https://esbuild.github.io/">esbuild</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-jsx-import"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-jsx-import.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-jsx-import -D
$ yarn add @chialab/esbuild-plugin-jsx-import -D
```

## Usage

```js
import esbuild from 'esbuild';
import jsxImportPlugin from '@chialab/esbuild-plugin-jsx-import';

await esbuild.build({
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    plugins: [
        jsxImportPlugin({
            jsxModule: '@chialab/dna',
            jsxExport: 'named',
        }),
    ],
});
```

---

## License

**Esbuild Plugin JSX Import** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-jsx-import/LICENSE) license.
