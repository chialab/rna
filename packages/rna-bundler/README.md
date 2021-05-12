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

### Via import

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

### Via cli

```sh
$ npm i @chialab/rna @chialab/rna-bundler -D
```

```
build [options] <entry...>

Options:
  -O, --output <path>         output directory or file
  -F, --format <type>         bundle format
  -P, --platform <type>       platform destination
  -B, --bundle                bundle dependencies
  -M, --minify                minify the build
  -W, --watch                 keep build alive
  -P, --public <path>         public path
  -T, --target <query>        browserslist targets
  -E, --entryNames <pattern>  output file names
  -C, --clean                 cleanup output path
  -J, --metafile [path]       generate manifest and endpoints maps
  -N, --name <identifier>     the iife global name
  --external [modules]        comma separated external packages
  --no-map                    do not generate sourcemaps
  --jsxPragma <identifier>    jsx pragma
  --jsxFragment <identifier>  jsx fragment
  --jsxModule <name>          jsx module name
  --jsxExport <type>          jsx export mode
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

RNA Bundler is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/rna-bundler/LICENSE) license.
