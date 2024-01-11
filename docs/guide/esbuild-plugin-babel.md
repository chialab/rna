# esbuild-plugin-babel

An [esbuild](https://esbuild.github.io/) plugin that runs [babel](https://babeljs.io/) for es5 transpilation.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-babel
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-babel
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-babel
```

:::

## Usage

::: info

If no configuration is provided, the plugin defaults already includes [typescript syntax support](https://babeljs.io/docs/en/babel-plugin-transform-typescript), the [env preset](https://babeljs.io/docs/en/babel-preset-env) and supports the [transpilation of tagged templates with htm](https://www.npmjs.com/package/babel-plugin-htm) to JSX.

:::

```ts
import babelPlugin from '@chialab/esbuild-plugin-babel';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [
        babelPlugin({
            // babel config
        }),
    ],
});
```
