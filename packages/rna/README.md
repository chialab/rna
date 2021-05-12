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

The `@chialab/rna` contains only the core of the RNA cli. In order to make commands work, you need to install each dependency.

| Command | Description | Module |
| ------- | ----------- | ------ |
| `build` | A JavaScript, CSS and HTML bundler based on esbuild. | [@chialab/rna-bundler](https://www.npmjs.com/package/@chialab/rna-bundler) |
| `serve` | A webapp server based on Web Dev Server. | [@chialab/rna-web-server](https://www.npmjs.com/package/@chialab/rna-web-server) |
| `test:web` | A test runner for browsers based on Web Test Runner. | [@chialab/rna-browser-test-runner](https://www.npmjs.com/package/@chialab/rna-browser-test-runner) |
| `test:node` | A test runner for node based on mocha. | [@chialab/rna-node-test-runner](https://www.npmjs.com/package/@chialab/rna-node-test-runner) |

### Common

```sh
$ npm i -D \
  @chialab/rna \
  @chialab/rna-bundler \
  @chialab/rna-web-server \
  @chialab/rna-browser-test-runner

$ yarn add -D \
  @chialab/rna \
  @chialab/rna-bundler \
  @chialab/rna-web-server \
  @chialab/rna-browser-test-runner
```

#### Build only

```sh
$ npm i -D @chialab/rna @chialab/rna-bundler

$ yarn add -D @chialab/rna @chialab/rna-bundler
```

#### Test node

```sh
$ npm i -D @chialab/rna @chialab/rna-node-test-runner

$ yarn add -D @chialab/rna @chialab/rna-node-test-runner
```

---

## License

RNA is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/rna/LICENSE) license.
