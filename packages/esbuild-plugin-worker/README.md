<p align="center">
    <strong>Esbuild Plugin Worker</strong> • Collect and transpile Web Workers with esbuild.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-worker"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-worker.svg?style=flat-square"></a>
</p>

---

## How it works

**Esbuild Plugin Worker** looks for `new Worker('./path/to/worker.js')` statements in JavaScript and TypeScript files and instructs esbuild to treat that references as entrypoints. Final output will be used to correctly update the statement.

For example, the following script:

```js
const worker = new Worker('./path/to/worker.js');
```

will be transformed to:

```js
const worker = new Worker(new URL('./path/to/worker.js', import.meta.url));
```

and then resolved by the [`@chialab/esbuild-plugin-meta-url`](../esbuild-plugin-meta-url) plugin.

Please note that RNA does not generate a `Worker` class to instantiate like webpack does, but it will just correctly update the import reference. If you need a `Worker` class, you have to wrap it yourself:

```javascript
const workerClass = function() {
    return new Worker('./path/to/worker.js');
};
```

⚠️ At the moment this plugin does not collect `importScript()` statements and does treat workers as modules, but we have plan to support the `{ type: "module" }` option in the near future.

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-worker -D
$ yarn add @chialab/esbuild-plugin-worker -D
```

## Usage

```js
import esbuild from 'esbuild';
import transfrom from '@chialab/esbuild-plugin-transform';
import workerPlugin from '@chialab/esbuild-plugin-worker';
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';

await esbuild.build({
    plugins: [
        transfrom([
            workerPlugin(),
            metaUrlPlugin(),
        ]),
    ],
});
```

You can also define a list of Worker constructors to use (default it will look for `Worker` and `SharedWorker`):

```js
workerPlugin({ constructors: ['Worker', 'MyWorker'] });
```

---

## License

**Esbuild Plugin Worker** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-worker/LICENSE) license.
