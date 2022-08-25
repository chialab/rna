<p align="center">
    <strong>wds-plugin-hmr-dna</strong> • Hot module replacement plugin for DNA components.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-hmr-dna"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-hmr-dna.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/wds-plugin-hmr-dna -D
$ yarn add @chialab/wds-plugin-hmr-dna -D
```

## Usage

```js
import { startDevServer } from '@web/dev-server';
import { hmrPlugin } from '@chialab/wds-plugin-hmr-dna';

await startDevServer({
    plugins: [
        hmrPlugin(),
    ],
});
```

---

## License

**wds-plugin-hmr-dna** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-hmr-dna/LICENSE) license.
