<p align="center">
    <strong>Wds Plugin Hmr CSS</strong> • Enable ES modules and CSS hot module replacement for the <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-hmr"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-hmr.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/wds-plugin-hmr -D
```

```sh
yarn add @chialab/wds-plugin-hmr -D
```

## Usage

```js
import { hmrPlugin } from '@chialab/wds-plugin-hmr';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [hmrPlugin()],
});
```

---

## License

**Wds Plugin Hmr CSS** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-hmr/LICENSE) license.
