<p align="center">
    <strong>Wds Plugin Legacy</strong> • Transform esm modules served by the <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a> into SystemJS modules for legacy browser compatibility.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-legacy"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-legacy.svg?style=flat-square"></a>
</p>

> [!CAUTION]
> Since we are moving away from the RNA cli, we are discontinuing the development of Web Dev Server plugins.

---

## Install

```sh
npm i @chialab/wds-plugin-legacy -D
```

```sh
yarn add @chialab/wds-plugin-legacy -D
```

## Usage

```js
import { legacyPlugin } from '@chialab/wds-plugin-legacy';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [legacyPlugin()],
});
```

This is similar to the [official legacy plugin](https://www.npmjs.com/package/@web/dev-server-legacy), but with a different polyfill strategy.

---

## License

**Wds Plugin Legacy** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-legacy/LICENSE) license.
