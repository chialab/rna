<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA Node Test Runner</strong> • A test runner for node based on <a href="https://mochajs.org/">Mocha</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-node-test-runner"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-node-test-runner.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/rna-node-test-runner -D
```

```sh
yarn add @chialab/rna-node-test-runner -D
```

## Usage

### Via import

```js
import { test } from '@chialab/rna-node-test-runner';

await test({
    // files: ['...'],
});
```

### Via cli

```
rna test:node [options] [specs...]

Options:
  --coverage  collect code coverage
  -h, --help  display help for command
```

---

## License

RNA Node Test Runner is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/rna-node-test-runner/LICENSE) license.
