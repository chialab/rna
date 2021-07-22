<p align="center">
    <strong>Wds Plugin Commonjs</strong> • A commonjs to esm transformer for the <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-commonjs"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-commonjs.svg?style=flat-square"></a>
</p>

> ⚠️ The development of this plugin has been suspended as it has been replaced by another plugin in the RNA ecosystem, but it can be a reference for other developers.

---

## Install

```sh
$ npm i @chialab/wds-plugin-commonjs -D
$ yarn add @chialab/wds-plugin-commonjs -D
```

## Usage

```js
import { startDevServer } from '@web/dev-server';
import { commonjsPlugin } from '@chialab/wds-plugin-commonjs';

await startDevServer({
    plugins: [
        commonjsPlugin(),
    ],
});
```

---

## License

**Wds Plugin Commonjs** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/wds-plugin-commonjs/LICENSE) license.
