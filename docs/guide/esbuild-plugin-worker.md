# esbuild-plugin-worker

Collect and transpile Web Workers with [esbuild](https://esbuild.github.io/).

## How it works

The plugin looks for `new Worker('./path/to/worker.js')` statements in JavaScript and TypeScript files and instructs esbuild to treat that references as entrypoints. Final output will be used to correctly update the statement.

For example, the following script:

```ts
const worker = new Worker('./path/to/worker.js');
```

will be transformed to:

```ts
const worker = new Worker(new URL('./path/to/worker.js', import.meta.url));
```

and then resolved by the [`@chialab/esbuild-plugin-meta-url`](./esbuild-plugin-meta-url) plugin.

Please note that RNA does not generate a `Worker` class to instantiate like webpack does, but it will just correctly update the import reference. If you need a `Worker` class, you have to wrap it yourself:

```javascript
const workerClass = function () {
    return new Worker('./path/to/worker.js');
};
```

::: warning

At the moment this plugin does not collect `importScript()` statements and does treat workers as modules, but we have plan to support the `{ type: "module" }` option in the near future.

:::

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-worker
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-worker
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-worker
```

:::

## Usage

```ts
import workerPlugin from '@chialab/esbuild-plugin-worker';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [workerPlugin()],
});
```

You can also define a list of Worker constructors to use (default it will look for `Worker` and `SharedWorker`):

```ts
workerPlugin({ constructors: ['Worker', 'MyWorker'] });
```
