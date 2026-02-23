# Wds Plugin RNA

A plugin for the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/) to transpile sources using the RNA bundler.

> [!CAUTION]
> Since we are moving away from the RNA cli, we are discontinuing the development of Web Dev Server plugins.

[![NPM](https://img.shields.io/npm/v/@chialab/wds-plugin-rna.svg)](https://www.npmjs.com/package/@chialab/wds-plugin-rna)

## Install

```sh
npm i @chialab/wds-plugin-rna -D
```

```sh
yarn add @chialab/wds-plugin-rna -D
```

```sh
pnpm add @chialab/wds-plugin-rna -D
```

## Usage

```js
import rnaPlugin from '@chialab/wds-plugin-rna';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [rnaPlugin()],
});
```

## License

**Wds Plugin RNA** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-rna/LICENSE) license.
