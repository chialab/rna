<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA Apidoc</strong> • Generate api documentation using TypeScript symbols.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-apidoc"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-apidoc.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/rna-apidoc -D
$ yarn add @chialab/rna-apidoc -D
```

## Usage

### Via import

```js
import { generate } from '@chialab/rna-apidoc';

await generate([
    'path/to/entrypoint.ts',
], 'docs/');
```

### Via cli

```sh
$ npm i @chialab/rna @chialab/rna-apidoc -D
```

```
apidoc [options] <files...>

Options:
  -O, --output <path>        output dir or file
  -h, --help                 display help for command
```

---

## License

RNA Apidoc is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/rna-apidoc/LICENSE) license.
