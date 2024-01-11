# esbuild-plugin-postcss

A CSS loader plugin for [esbuild](https://esbuild.github.io/) that uses [PostCSS](https://postcss.org/) as preprocessor.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-postcss
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-postcss
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-postcss
```

:::

## Usage

```js
import postcssPlugin from '@chialab/esbuild-plugin-postcss';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [postcssPlugin()],
});
```

This plugin looks for a postcss configuration in the project and fallbacks to out custom [postcss-preset-env](https://www.npmjs.com/package/postcss-preset-env).

### Sass

The plugin automatically tries to load the `@chialab/postcss-plugin-dart-sass` when it processes `.scss` files. Please make sure to have installed the optional dependency in order to correctly transpiler Sass files:

::: code-group

```sh[npm]
npm i -D @chialab/postcss-plugin-dart-sass
```

```sh[yarn]
yarn add -D @chialab/postcss-plugin-dart-sass
```

```sh[pnpm]
pnpm add -D @chialab/postcss-plugin-dart-sass
```

:::
