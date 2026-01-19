<p align="center">
    <strong>Esbuild Plugin Lightning CSS</strong><br />A CSS loader plugin for <a href="https://esbuild.github.io/">esbuild</a> that uses <a href="https://lightningcss.dev/">Lightning CSS</a> as preprocessor.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-lightningcss"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-lightningcss.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/esbuild-plugin-lightningcss -D
```

```sh
yarn add @chialab/esbuild-plugin-lightningcss -D
```

## Usage

```js
import lightningcssPlugin from '@chialab/esbuild-plugin-lightningcss';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [lightningcssPlugin()],
});
```

---

## License

**esbuild-plugin-lightningcss** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-lightningcss/LICENSE) license.
