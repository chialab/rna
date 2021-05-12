<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA Web Server</strong> • A webapp server based on <a href="https://modern-web.dev/docs/dev-server/overview/">Web Dev Server</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/rna-web-server"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/rna-web-server.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/rna-web-server -D
$ yarn add @chialab/rna-web-server -D
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
$ npm i @chialab/rna @chialab/rna-web-server -D
```

```
serve [options] [root]

Options:
  -P, --port <number>           server port number
  -M, --metafile [path]         generate manifest and endpoints maps
  -E, --entrypoints <entry...>  list of server entrypoints
  -h, --help                    display help for command
```

**Samples**

```sh
$ rna serve
$ rna serve public --port 3000
```

---

## License

RNA Web Server is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/rna-web-server/LICENSE) license.
