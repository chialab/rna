<p align="center">
    <strong>WTR Mocha Reporter</strong> • A <a href="https://mochajs.org/">Mocha</a> reporter interface for the <a href="https://modern-web.dev/docs/test-runner/overview/">Web Test Runner</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wtr-mocha-reporter"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wtr-mocha-reporter.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/wtr-mocha-reporter -D
```

```sh
yarn add @chialab/wtr-mocha-reporter -D
```

## Usage

```js
import { mochaReporter } from '@chialab/wtr-mocha-reporter';

export default {
    reporters: [mochaReporter()],
};
```

---

## License

**WTR Mocha Reporter** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wtr-mocha-reporter/LICENSE) license.
