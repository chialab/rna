<p align="center">
    <strong>Wds Plugin Polyfill</strong> • Inject polyfills to HTML responses served by the <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-polyfill"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-polyfill.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/wds-plugin-polyfill -D
```

```sh
yarn add @chialab/wds-plugin-polyfill -D
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

---

## License

**Wds Plugin Polyfill** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/wds-plugin-polyfill/LICENSE) license.
