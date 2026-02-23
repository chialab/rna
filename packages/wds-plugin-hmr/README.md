# Wds Plugin Hmr CSS

Enable ES modules and CSS hot module replacement for the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/).

> [!CAUTION]
> Since we are moving away from the RNA cli, we are discontinuing the development of Web Dev Server plugins.

[![NPM](https://img.shields.io/npm/v/@chialab/wds-plugin-hmr.svg)](https://www.npmjs.com/package/@chialab/wds-plugin-hmr)

---

## Install

```sh
npm i @chialab/wds-plugin-hmr -D
```

```sh
yarn add @chialab/wds-plugin-hmr -D
```

```sh
pnpm add @chialab/wds-plugin-hmr -D
```

## Usage

```js
import { hmrPlugin } from '@chialab/wds-plugin-hmr';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [hmrPlugin()],
});
```

## License

**Wds Plugin Hmr CSS** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-hmr/LICENSE) license.
