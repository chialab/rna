<p align="center">
    <strong>Esbuild Plugin Transform</strong> • Pipe transformation plugin for <a href="https://esbuild.github.io/">esbuild</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-transform"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-transform.svg?style=flat-square"></a>
</p>

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-transform -D
$ yarn add @chialab/esbuild-plugin-transform -D
```

## Usage

```js
import esbuild from 'esbuild';
import transform from '@chialab/esbuild-plugin-transform';

await esbuild.build({
    plugins: [
        transform([
            // plugins
        ]),
    ],
});
```

## Create a plugin

First of all, install **Esbuild Plugin Transform**:

```sh
npm i @chialab/esbuild-plugin-transform
```

Then, use module helpers to retrieve contents and mappings:

```js
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

async function transform(code, map) {
    ...
}

export default {
    name: '...',
    setup(build) {
        build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
            const entry = await getEntry(build, args.path);
            const { code, map } = await transform(entry.code);

            return finalizeEntry(entry, {
                code,
                map,
                loader: 'js',
            });
        });
    },
};

```

---

## License

**Esbuild Plugin Transform** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-transform/LICENSE) license.
