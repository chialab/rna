<p align="center">
    <strong>Estransform</strong> • Execute multiple transformations on JavaScript sources with full sourcemaps support.
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
import { transform } from '@chialab/estransform';

const { code, map } = await transform(
    'require("tslib"); module.exports = function() {}',
    { sourceContents: true },
    (magicCode, contents) => {
        magicCode.overwrite(0, contents.length, 'Hello!');
    }
);
```

---

## License

**Estransform** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/estransform/LICENSE) license.
