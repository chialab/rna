<p align="center">
    <strong>Esbuild Plugin Worker</strong> • Collect and transpile Web Workers with esbuild.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-worker"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-worker.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-worker -D
$ yarn add @chialab/esbuild-plugin-worker -D
```

## Usage

```js
import esbuild from 'esbuild';
import workerPlugin from '@chialab/esbuild-plugin-worker';

await esbuild.build({
    plugins: [
        workerPlugin({ mode: 'collect' /* or just "resolve" */ }),
    ],
});
```

---

## License

**Esbuild Plugin Worker** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-worker/LICENSE) license.
