<p align="center">
    <strong>Esbuild Plugin Postcss</strong> • A CSS loader plugin for <a href="https://esbuild.github.io/">esbuild</a> that uses <a href="https://postcss.org/">postcss</a> as preprocessor.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-postcss"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-postcss.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/esbuild-plugin-postcss -D
```

```sh
yarn add @chialab/esbuild-plugin-postcss -D
```

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

```sh
npm i @chialab/postcss-plugin-dart-sass -D
```

```sh
yarn add @chialab/postcss-plugin-dart-sass -D
```

---

## License

**Esbuild Plugin Postcss** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-postcss/LICENSE) license.
