<p align="center">
    <strong>Postcss Url Rebase</strong> • A <a href="https://postcss.org/">postcss</a> plugin for `url()` rebasing before import.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/postcss-url-rebase"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/postcss-url-rebase.svg?style=flat-square"></a>
</p>

## Install

```sh
npm i @chialab/postcss-url-rebase -D
```

```sh
yarn add @chialab/postcss-url-rebase -D
```

## Usage

```js
import postcss from 'postcss';
import urlRebase from '@chialab/postcss-url-rebase';

postcss([
    urlRebase(),
]).process(...);
```

---

## License

**Postcss Url Rebase** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/postcss-url-rebase/LICENSE) license.
