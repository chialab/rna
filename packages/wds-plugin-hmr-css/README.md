<p align="center">
    <strong>Wds Plugin Hmr CSS</strong> • Enable CSS hmr for the <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-hmr-css"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-hmr-css.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/wds-plugin-hmr-css -D
$ yarn add @chialab/wds-plugin-hmr-css -D
```

## Usage

```js
import { startDevServer } from '@web/dev-server';
import { hmrCssPlugin } from '@chialab/wds-plugin-hmr-css';

await startDevServer({
    plugins: [
        hmrCssPlugin(),
    ],
});
```

---

## License

**Wds Plugin Hmr CSS** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/wds-plugin-hmr-css/LICENSE) license.
