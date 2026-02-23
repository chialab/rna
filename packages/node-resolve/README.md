# Node Resolve

A promise based node resolution library based on <a href="https://github.com/webpack/enhanced-resolve">enhanced-resolve</a>.

> [!CAUTION]
> This plugin development is deprecated and discontinued, as we are going to remove support for the `style` resolution field in package.json. It's recommended to use the [`oxc-resolver`](https://www.npmjs.com/package/oxc-resolver) package instead.

[![NPM](https://img.shields.io/npm/v/@chialab/node-resolve.svg)](https://www.npmjs.com/package/@chialab/node-resolve)

---

## Install

```sh
npm i @chialab/node-resolve -D
```

```sh
yarn add @chialab/node-resolve -D
```

```sh
pnpm add @chialab/node-resolve -D
```

## Usage

```js
import { resolve } from '@chialab/node-resolve';

await resolve('lit', '/path/to/www/js');
```

## License

**Node Resolve** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/node-resolve/LICENSE) license.
