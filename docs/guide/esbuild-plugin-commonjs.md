# esbuild-plugin-commonjs

A commonjs to esm converter for [esbuild](https://esbuild.github.io/).

## Why

When a dependency is loaded using `require` but marked as external, esbuild will not transform the require statement, breaking the ESM module.

This plugin will transform the `require` statements to `import` statements, so that the module will be correctly loaded as ESM.

Furthermore, even if UMD modules are transformed to ESM, they still will pollute the `window` singleton in browsers, in order to preserve dependencies injection.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-commonjs
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-commonjs
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-commonjs
```

:::

## Usage

```ts
import commonjsPlugin from '@chialab/esbuild-plugin-commonjs';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [commonjsPlugin()],
});
```
