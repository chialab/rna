<p align="center">
    <strong>Esbuild Plugin Meta Url</strong> • A file loader plugin for <a href="https://esbuild.github.io/">esbuild</a> for constructed URLs using import metadata.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-meta-url"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-meta-url.svg?style=flat-square"></a>
</p>

---

## How it works

**Esbuild Plugin Meta Url** looks for `new URL('path/to/file.png', import.meta.url)` in JavaScript and TypeScript files and instructs esbuild to copy referenced files. This is a standard version of the file loader.

```js
// DONT ❌
import img from './logo.png';

// DO ✅
const img = new URL('./logo.png', import.meta.url).href;
```

---

## Install

```sh
npm i @chialab/esbuild-plugin-meta-url -D
```

```sh
yarn add @chialab/esbuild-plugin-meta-url -D
```

## Usage

```js
import esbuild from 'esbuild';
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';

await esbuild.build({
    plugins: [
        metaUrlPlugin(),
    ],
});
```

---

## License

**Esbuild Plugin Meta Url** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-meta-url/LICENSE) license.
