<p align="center">
    <strong>Esbuild Plugin Commonjs</strong> • A commonjs to esm converter for <a href="https://esbuild.github.io/">esbuild</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-commonjs"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-commonjs.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/esbuild-plugin-commonjs -D
```

```sh
yarn add @chialab/esbuild-plugin-commonjs -D
```

## Usage

```js
import esbuild from 'esbuild';
import commonjsPlugin from '@chialab/esbuild-plugin-commonjs';

await esbuild.build({
    plugins: [
        commonjsPlugin(),
    ],
});
```

---

## License

**Esbuild Plugin Commonjs** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-commonjs/LICENSE) license.
