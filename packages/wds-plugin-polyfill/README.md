# Wds Plugin Polyfill

Inject polyfills to HTML responses served by the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/).

> [!CAUTION]
> Since we are moving away from the RNA cli, we are discontinuing the development of Web Dev Server plugins.

[![NPM](https://img.shields.io/npm/v/@chialab/wds-plugin-polyfill.svg)](https://www.npmjs.com/package/@chialab/wds-plugin-polyfill)

## Install

```sh
npm i @chialab/wds-plugin-polyfill -D
```

```sh
yarn add @chialab/wds-plugin-polyfill -D
```

```sh
pnpm add @chialab/wds-plugin-polyfill -D
```

## Usage

```js
import { polyfillPlugin } from '@chialab/wds-plugin-polyfill';
import { startDevServer } from '@web/dev-server';

await startDevServer({
    plugins: [
        polyfillPlugin({
            minify: true,
            features: {
                'URL': {},
                'URL.prototype.toJSON': {},
                'URLSearchParams': {},
                'Promise': {},
                'Promise.prototype.finally': {},
                'fetch': {},
            },
        }),
    ],
});
```

It uses the [polyfill.io](https://github.com/Financial-Times/polyfill-library) library under the hoods.

## License

**Wds Plugin Polyfill** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-polyfill/LICENSE) license.
