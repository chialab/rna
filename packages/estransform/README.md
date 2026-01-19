<p align="center">
    <strong>Estransform</strong><br />Execute multiple transformations on JavaScript sources with full sourcemaps support.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/estransform"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/estransform.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/estransform -D
```

```sh
yarn add @chialab/estransform -D
```

## Usage

```js
import { parse } from '@chialab/estransform';

const { ast, helpers } = await transform('require("tslib"); module.exports = function() {}', {
    sourceContents: true,
});

helpers.overwrite(0, contents.length, 'Hello!');
```

---

## License

**Estransform** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/estransform/LICENSE) license.
