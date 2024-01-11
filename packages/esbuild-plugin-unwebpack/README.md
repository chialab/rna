<p align="center">
    <strong>esbuild-plugin-unwebpack</strong> • Remove webpack features from sources.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-unwebpack"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-unwebpack.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/esbuild-plugin-unwebpack -D
```

```sh
yarn add @chialab/esbuild-plugin-unwebpack -D
```

## Usage

```js
import unwebpackPlugin from '@chialab/esbuild-plugin-unwebpack';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [unwebpackPlugin()],
});
```

---

## License

**esbuild-plugin-unwebpack** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-unwebpack/LICENSE) license.
