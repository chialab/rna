<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA Bundler</strong> • A JavaScript, CSS and HTML bundler based on <a href="https://esbuild.github.io/">esbuild</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-bundler"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-bundler.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/rna-bundler -D
$ yarn add @chialab/rna-bundler -D
```

## Usage

Compile JS and CSS modules and HTML apps using [`esbuild`](https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.

```js
import { build } from '@chialab/rna';

await build({
    output: 'dist/esm/index.js',
    input: 'index.js',
    // code: '...',
    // rootDir: '.',
    platform: 'browser' // 'node',
    format: 'esm', // 'cjs' 'iife'
    // globalName: '', // global name for iife modules
    sourcemap: true,
    minify: true,
});
```

---

### Known limitations and workarounds

Esbuild does not merge import statements from the same external source when bundling (see [#3](https://github.com/chialab/rna/issues/3)). Consumed esbuild bundles in webpack can be affected by a wrong optimization.  

**Workaround**  
Update webpack configuration with following rule:

```js
module.exports = {
    optimization: {
        innerGraph: false,
    },
};
```

---

## License

RNA Bundler is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/rna-bundler/LICENSE) license.
