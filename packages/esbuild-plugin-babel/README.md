<p align="center">
    <strong>Esbuild Plugin Babel</strong> • A pluggable <a href="https://esbuild.github.io/">esbuild</a> plugin that runs <a href="https://babeljs.io/">babel</a> for es5 transpilation.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-babel"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-babel.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-babel -D
$ yarn add @chialab/esbuild-plugin-babel -D
```

## Usage

```js
import esbuild from 'esbuild';
import babelPlugin from '@chialab/esbuild-plugin-babel';

await esbuild.build({
    plugins: [
        babelPlugin({
            plugins: [...],
        }),
    ],
});
```

Please not that it already includes [typescript syntax support](https://babeljs.io/docs/en/babel-plugin-transform-typescript), the [env preset](https://babeljs.io/docs/en/babel-preset-env) and supports the [transpilation of tagged templates with htm](https://www.npmjs.com/package/babel-plugin-htm) to JSX.

---

## License

**Esbuild Plugin Babel** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/esbuild-plugin-babel/LICENSE) license.
