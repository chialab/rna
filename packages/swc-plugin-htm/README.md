<p align="center">
    <strong>SWC Plugin HTM</strong> • A <a href="https://swc.rs/">swc</a> plugin for <a href="https://github.com/developit/htm/">htm</a> literals transpiling. Highly inspired by its babel counterpart <a href="https://www.npmjs.com/package/babel-plugin-htm">babel-plugin-htm</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/swc-plugin-html"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/swc-plugin-html.svg?style=flat-square"></a>
</p>

> ⚠️ The development of this plugin has been suspended for maintenance reasons after an initial trial period. Developments will follow when the swc project will be more stable.

---

## Install

```sh
$ npm i @chialab/swc-plugin-html -D
$ yarn add @chialab/swc-plugin-html -D
```

## Usage

```js
import swc from '@swc/core';
import { plugin as htmPlugin } from '@chialab/swc-plugin-htm';

swc
    .transform("source code", {
        plugin: htmPlugin({ tag: 'html', pragma: 'h' }),
    })
    .then((output) => {
        output.code; // transformed code
        output.map; // source map (in string)
    });
```

---

## License

**SWC Plugin HTM** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/swc-plugin-html/LICENSE) license.
