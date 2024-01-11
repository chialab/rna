# esbuild-plugin-meta-url

A file loader plugin for [esbuild](https://esbuild.github.io/) for constructed URLs using import metadata.

The plugin looks for `new URL('path/to/file.png', import.meta.url)` in JavaScript and TypeScript files and instructs esbuild to copy referenced files. This is a standard version of the file loader.

```js
// DONT ❌
import img from './logo.png';

// DO ✅
const img = new URL('./logo.png', import.meta.url).href;
```

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-meta-url
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-meta-url
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-meta-url
```

:::

## Usage

```ts
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [metaUrlPlugin()],
});
```
