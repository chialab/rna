# vite-plugin-worker-proxy

Workers has a cross-origin policy that prevents them from being imported from a different origin. This plugin allows to import workers from a different origin by proxying the worker script with a Blob url.

Generally, this plugin is useful only in development mode, since in production the worker script should be served from the same origin.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vite-plugin-worker-proxy
```

```sh[yarn]
yarn add -D @chialab/vite-plugin-worker-proxy
```

```sh[pnpm]
pnpm add -D @chialab/vite-plugin-worker-proxy
```

:::

## Usage

```ts[vite.config.ts]
import { defineConfig } from 'vite';
import workerProxy from '@chialab/vite-plugin-worker-proxy';

export default defineConfig(({ command }) => ({
    plugins: [
        command === 'serve' ? workerProxy() : null,
    ],
}));
```

## Options

The plugin accepts an options object with the following properties:

### `constructors`

-   Type: `string[]`

A list of constructors to proxy. By default, the plugin proxies only the `Worker` and `SharedWorker` constructors.
