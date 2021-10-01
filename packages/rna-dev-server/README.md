<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA Dev Server</strong> • A webapp server based on <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-dev-server"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-dev-server.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/rna-dev-server -D
$ yarn add @chialab/rna-dev-server -D
```

## Usage

Start a [web dev server](https://modern-web.dev/docs/dev-server/overview/) that transforms ESM imports for node resolution on demand. It also uses [`esbuild`](https://esbuild.github.io/) to compile non standard JavaScript syntax.

### Via import

```js
import { serve } from '@chialab/rna';

/**
 * @see https://modern-web.dev/docs/dev-server/cli-and-configuration/
 */
await serve({
    // rootDir: '.',
});
```

### Via cli

```sh
$ npm i @chialab/rna @chialab/rna-dev-server -D
```

```
rna serve [options] [root]

Options:
  -P, --port <number>  server port number
  -C, --config <path>  the rna config file
  -h, --help           display help for command
```

**Samples**

```sh
$ rna serve
$ rna serve public --port 3000
```

---

## License

RNA Dev Server is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/rna-dev-server/LICENSE) license.
