<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/master/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA</strong> • A bundler, a server and a test runner for modern modules and applications.
</p>

<p align="center">
    <a href="https://www.chialab.io/p/rna"><img alt="Documentation link" src="https://img.shields.io/badge/Docs-chialab.io-lightgrey.svg?style=flat-square"></a>
    <a href="https://github.com/chialab/rna"><img alt="Source link" src="https://img.shields.io/badge/Source-GitHub-lightgrey.svg?style=flat-square"></a>
    <a href="https://www.chialab.it"><img alt="Authors link" src="https://img.shields.io/badge/Authors-Chialab-lightgrey.svg?style=flat-square"></a>
    <a href="https://www.npmjs.com/package/@chialab/rna"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna.svg?style=flat-square"></a>
    <a href="https://github.com/chialab/rna/blob/master/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/@chialab/rna.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/rna -D
$ yarn add @chialab/rna -D
```

## Usage

You can import RNA as a module or use it via CLI.

### CLI

#### `build <entry>`

Compile JS and CSS modules using [`esbuild`](https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.

```
Options:
  -O, --output <path>  output directory or file
  -F, --format <type>  bundle format
  -B, --bundle         bundle dependencies
  -M, --minify         minify the build
  -h, --help           display help for command
```

**Samples**

```sh
$ rna build src/index.js --output dist/esm/index.js --format esm
$ rna build src/index.js --output public/index.js --format iife --minify --bundle
$ rna build src/index.css --output public/index.css --minify --bundle
```

#### `serve [root]`

Start a [web dev server](https://modern-web.dev/docs/dev-server/overview/) that transforms ESM imports for node resolution on demand. It also uses [`esbuild`](https://esbuild.github.io/) to compile non standard JavaScript syntax.

```
Options:
  -P, --port <number>  server port number
  -h, --help           display help for command
```

**Samples**

```sh
$ rna serve
$ rna serve public --port 3000
```

#### `test [specs]`

Start a browser [test runner](https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses [mocha](https://mochajs.org/) but you still need to import an assertion library (recommended [`@open-wc/testing`](https://open-wc.org/docs/testing/testing-package/)).

```
Options:
  -W, --watch     watch test files
  -C, --coverage  add coverage to tests
  -O, --open      open the browser
  -h, --help      display help for command
```

**Samples**

```sh
$ rna test
$ rna test 'test/**/*.spec.js' --coverage
$ rna test 'test/elements.spec.js' --watch --open
```

### Module

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

```js
import { serve } from '@chialab/rna';

/**
 * @see https://modern-web.dev/docs/dev-server/cli-and-configuration/
 */
await serve({
    // rootDir: '.',
});
```

```js
import { test } from '@chialab/rna';

/**
 * @see https://modern-web.dev/docs/test-runner/cli-and-configuration/
 */
await test({
    // files: ['...'],
});
```

---

## License

RNA is released under the [MIT](https://github.com/chialab/rna/blob/master/LICENSE) license.
