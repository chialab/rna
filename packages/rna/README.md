<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA</strong> • A bundler, a server and a test runner for modern modules and applications.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/rna -D
$ yarn add @chialab/rna -D
```

## Usage

You can import RNA as a module or use it via CLI.

#### `build <entry...>`

Compile JS and CSS modules and HTML apps using [`esbuild`](https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.

```
Options:
  -O, --output <path>         output directory or file
  -F, --format <type>         bundle format
  -B, --bundle                bundle dependencies
  -M, --minify                minify the build
  -W, --watch                 keep build alive
  -P, --public <path>         public path
  -T, --target <query>        browserslist targets
  -E, --entryNames <pattern>  output file names
  -C, --clean                 cleanup output path
  -J, --metafile [path]       generate manifest and endpoints maps
  --no-map                    do not generate sourcemaps
  -h, --help                  display help for command
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
  -P, --port <number>           server port number
  -J, --metafile [path]         generate manifest and endpoints maps
  -E, --entrypoints <entry...>  list of server entrypoints
  -h, --help                    display help for command
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

---

## License

RNA is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/rna/LICENSE) license.
