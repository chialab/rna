<p align="center">
    <strong>Wds Plugin RNA</strong> • A plugin for the Web Dev Server to transpile sources using the RNA bundler.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-rna"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-rna.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/wds-plugin-rna -D
```

```sh
yarn add @chialab/wds-plugin-rna -D
```

## Usage

```js
import rnaPlugin from '@chialab/wds-plugin-rna';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [rnaPlugin()],
});
```

---

## License

**Wds Plugin RNA** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-rna/LICENSE) license.
