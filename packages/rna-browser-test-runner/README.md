<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA Browser Test Runner</strong> • A test runner for browsers based on <a href="https://modern-web.dev/docs/test-runner/overview/">Web Test Runner</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-browser-test-runner"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-browser-test-runner.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/rna-browser-test-runner -D
$ yarn add @chialab/rna-browser-test-runner -D
```

## Usage

Start a browser [test runner](https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses [mocha](https://mochajs.org/) but you still need to import an assertion library (recommended [`@open-wc/testing`](https://open-wc.org/docs/testing/testing-package/)).

### Via import

```js
import { test } from '@chialab/rna-browser-test-runner';

/**
 * @see https://modern-web.dev/docs/test-runner/cli-and-configuration/
 */
await test({
    // files: ['...'],
});
```

### Via cli

```sh
$ npm i @chialab/rna @chialab/rna-browser-test-runner -D
```

```
test:browser [options] [specs...]

Options:
  -P, --port                 web server port
  --watch                    watch test files
  --concurrency <number>     number of concurrent browsers
  --coverage                 add coverage to tests
  --manual                   manual test mode
  --open                     open the browser
  --saucelabs [browsers...]  run tests using Saucelabs browsers
  -h, --help                 display help for command
```

**Samples**

```sh
$ rna test:browser
$ rna test:browser 'test/**/*.spec.js' --coverage
$ rna test:browser 'test/elements.spec.js' --watch --open
```

---

## License

RNA Browser Test Runner is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/rna-browser-test-runner/LICENSE) license.
