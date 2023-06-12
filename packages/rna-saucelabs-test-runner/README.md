<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA Saucelabs Test Runner</strong> • A test runner for Saucelabs based on <a href="https://modern-web.dev/docs/test-runner/overview/">Web Test Runner</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-saucelabs-test-runner"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-saucelabs-test-runner.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/rna-saucelabs-test-runner -D
```

```sh
yarn add @chialab/rna-saucelabs-test-runner -D
```

## Usage

Start a saucelabs [test runner](https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses [mocha](https://mochajs.org/) but you still need to import an assertion library (recommended [`@open-wc/testing`](https://open-wc.org/docs/testing/testing-package/)).

### Via import

```js
import { test } from '@chialab/rna-saucelabs-test-runner';

/**
 * @see https://modern-web.dev/docs/test-runner/cli-and-configuration/
 */
await test({
    // files: ['...'],
}, {
    // saucelabs username
    user: '...',
    // saucelabs access key
    key: '...',
});
```

### Via cli

```
test:saucelabs [options] [specs...]

Options:
  -P, --port                 dev server port
  --browsers [browsers...]   saucelabs browsers list
  --watch                    watch test files
  --concurrency <number>     number of concurrent browsers
  --coverage                 add coverage to tests
  --manual                   manual test mode
  --open                     open the browser
  -U, --user                 sauce username
  -K, --key                  sauce access key
  -h, --help                 display help for command
```

**Samples**

```sh
rna test:saucelabs
```

```sh
rna test:saucelabs 'test/**/*.spec.js' --coverage
```

```sh
rna test:saucelabs 'test/elements.spec.js' --browsers 'ie 11' 'chrome 60' 'ios 10.3'
```

---

## License

RNA Saucelabs Test Runner is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/rna-saucelabs-test-runner/LICENSE) license.
