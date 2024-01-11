# esbuild-plugin-require-resolve

A file loader plugin for [esbuild](https://esbuild.github.io/) for `require.resolve` statements.

## How it works

The plugin looks for `require.resolve('path/to/file.png')` statements in JavaScript and TypeScript files and instructs esbuild to copy referenced files.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-require-resolve
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-require-resolve
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-require-resolve
```

:::

## Usage

```ts
import requireResolvePlugin from '@chialab/esbuild-plugin-require-resolve';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [requireResolvePlugin()],
});
```
