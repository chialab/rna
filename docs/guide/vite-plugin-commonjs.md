# vite-plugin-commonjs

Convert CommonJS modules to ES Modules on the fly with Vite.

This plugin works only when Vite is used in `serve` mode and aims to prevent the need of optimizing dependencies.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vite-plugin-commonjs
```

```sh[yarn]
yarn add -D @chialab/vite-plugin-commonjs
```

```sh[pnpm]
pnpm add -D @chialab/vite-plugin-commonjs
```

:::

## Usage

```ts[vite.config.ts]
import { defineConfig } from 'vite';
import commonjs from '@chialab/vite-plugin-commonjs';

export default defineConfig({
    plugins: [
        commonjs(),
    ],
});
```

## Options

The plugin accepts an options object with the following properties:

### `optimizeDeps`

- Type: `boolean`

Re-enable dependency optimization. By the default, the plugin disables Vite optimizations.
