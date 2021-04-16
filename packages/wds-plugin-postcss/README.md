<p align="center">
    <strong>Wds Plugin Postcss</strong> • A CSS loader plugin for the <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a> that uses <a href="https://postcss.org/">postcss</a> as preprocessor.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/wds-plugin-postcss"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/wds-plugin-postcss.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/wds-plugin-postcss -D
$ yarn add @chialab/wds-plugin-postcss -D
```

## Usage

```js
import { startDevServer } from '@web/dev-server';
import { cssPlugin } from '@chialab/wds-plugin-postcss';

await startDevServer({
    plugins: [
        cssPlugin(),
    ],
});
```

This plugin looks for a postcss configuration in the project, otherwise it just rebase url references with the node resolve algorithm.

---

## License

**Wds Plugin Postcss** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/wds-plugin-postcss/LICENSE) license.
