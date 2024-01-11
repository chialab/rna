# esbuild-plugin-env

Define all environement variables for [esbuild](https://esbuild.github.io/).

Replace `process.env.SOMETHING` occurences with the corresponding value, even for browser builds.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-env
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-env
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-env
```

:::

## Usage

```ts
import envPlugin from '@chialab/esbuild-plugin-env';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [envPlugin()],
});
```
