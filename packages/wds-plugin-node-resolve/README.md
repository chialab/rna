<p align="center">
    <strong>Wds Plugin Node Resolve</strong> • A plugin the Web Dev Server for node resolutions.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-node-resolve"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-node-resolve.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/wds-plugin-node-resolve -D
```

```sh
yarn add @chialab/wds-plugin-node-resolve -D
```

## Usage

```js
import nodeResolvePlugin from '@chialab/wds-plugin-node-resolve';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [nodeResolvePlugin()],
});
```

---

## License

**Wds Plugin Node Resolve** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-node-resolve/LICENSE) license.
