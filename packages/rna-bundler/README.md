<p align="center">
    <strong>RNA Bundler</strong> • A JavaScript, CSS and HTML bundler based on <a href="https://esbuild.github.io/">esbuild</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-bundler"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-bundler.svg?style=flat-square"></a>
</p>

> [!CAUTION]
> RNA cli development is deprecated and discontinued. It's recommended to use RNA plugins directly in your projects using vite, esbuild, or other supported tools.

---

## Install

The bundler is part of the `@chialab/rna` cli, but you can use it as a module.

```sh
npm i @chialab/rna-bundler -D
```

```sh
yarn add @chialab/rna-bundler -D
```

## Usage

Compile JS and CSS modules and HTML apps using [`esbuild`](https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.

Please note that HTML and CSS loaders are separated plugins that needs to be installed in order to work.

### Via import

```js
import { build } from '@chialab/rna';

await build({
    input: 'index.js',
    output: 'dist/esm/index.js',
    // code: '...',
    // rootDir: '.',
    platform: 'browser' // 'node',
    format: 'esm', // 'cjs' 'iife'
    // globalName: '', // global name for iife modules
    sourcemap: true,
    minify: true,
});
```

### Via cli

```
rna build [options] [entry...]

Options:
  -C, --config <path>         the rna config file
  -O, --output <path>         output directory or file
  --format <type>             bundle format
  --platform <type>           platform destination
  --bundle                    bundle dependencies
  --minify                    minify the build
  --public <path>             public path
  --target <query>            output targets (es5, es2015, es2020)
  --entryNames <pattern>      output file names
  --chunkNames <pattern>      output chunk names
  --assetNames <pattern>      output asset names
  --clean                     cleanup output path
  --manifest <path>           generate manifest file
  --entrypoints <path>        generate entrypoints file
  --name <identifier>         the iife global name
  --external [modules]        comma separated external packages
  --no-map                    do not generate sourcemaps
  --jsx <mode>                jsx transformation mode (transform, preserve, automatic)
  --jsxFactory <identifier>   jsx pragma
  --jsxFragment <identifier>  jsx fragment
  --jsxImportSource <name>    jsx module name
  -h, --help                  display help for command
```

**Samples**

```sh
$ rna build src/index.js --output dist/esm/index.js --format esm
$ rna build src/index.js --output public/index.js --format iife --minify --bundle
$ rna build src/index.css --output public/index.css --minify --bundle
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

RNA Bundler is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/rna-bundler/LICENSE) license.
