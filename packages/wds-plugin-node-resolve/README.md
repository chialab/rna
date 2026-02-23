# Wds Plugin Node Resolve

A plugin for the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/) for node resolutions.

> [!CAUTION]
> Since we are moving away from the RNA cli, we are discontinuing the development of Web Dev Server plugins.

[![NPM](https://img.shields.io/npm/v/@chialab/wds-plugin-node-resolve.svg)](https://www.npmjs.com/package/@chialab/wds-plugin-node-resolve)

---

## Install

```sh
npm i @chialab/wds-plugin-node-resolve -D
```

```sh
yarn add @chialab/wds-plugin-node-resolve -D
```

```sh
pnpm add @chialab/wds-plugin-node-resolve -D
```

## Usage

```js
import nodeResolvePlugin from '@chialab/wds-plugin-node-resolve';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [nodeResolvePlugin()],
});
```

## License

**Wds Plugin Node Resolve** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-node-resolve/LICENSE) license.
