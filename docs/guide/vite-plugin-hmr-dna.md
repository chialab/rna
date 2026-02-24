# vite-plugin-hmr-dna

Hot module replacement for [DNA](https://chialab.github.io/dna/) components and [Vite](https://vite.dev/).

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vite-plugin-hmr-dna
```

```sh[yarn]
yarn add -D @chialab/vite-plugin-hmr-dna
```

```sh[pnpm]
pnpm add -D @chialab/vite-plugin-hmr-dna
```

:::

## Usage

Add the plugin to your Vite config:

::: code-group

```ts[vite.config.ts]
import { hmrPlugin } from '@chialab/vite-plugin-hmr-dna';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    hmrPlugin(),
  ],
});
```

:::
