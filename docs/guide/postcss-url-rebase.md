# postcss-url-rebase

A [PostCSS](https://postcss.org/) plugin for `url()` rebasing before import.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/postcss-url-rebase
```

```sh[yarn]
yarn add -D @chialab/postcss-url-rebase
```

```sh[pnpm]
pnpm add -D @chialab/postcss-url-rebase
```

:::

## Usage

```ts
import postcss from 'postcss';
import urlRebase from '@chialab/postcss-url-rebase';

postcss([
    urlRebase(),
]).process(...);
```
