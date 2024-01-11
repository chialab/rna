# esbuild-plugin-any-file

A loader plugin for [esbuild](https://esbuild.github.io/) for files with unknown loader.

This plugins scans configured esbuild loaders. If it can't find a loader for an entrypoint, it will try to load it as a file.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-any-file
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-any-file
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-any-file
```

:::

## Usage

```ts
import filePlugin from '@chialab/esbuild-plugin-any-file';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [filePlugin()],
});
```
