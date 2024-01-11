# esbuild-plugin-virtual

A virtual file system for [esbuild](https://esbuild.github.io/) modules.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-virtual
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-virtual
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-virtual
```

:::

## Usage

Define a virtual module:

```ts
import virtualPlugin from '@chialab/esbuild-plugin-virtual';
import esbuild from 'esbuild';

await esbuild.build({
    entrypoints: ['index.js'],
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

::: code-group

```ts[index.js]
import { nil } from 'virtual-entry.js';

nil();
```
