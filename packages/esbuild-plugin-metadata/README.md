<p align="center">
    <strong>esbuild-plugin-metadata</strong> • Write entrypoints.json for esbuild builds.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-metadata"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-metadata.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/esbuild-plugin-metadata -D
```

```sh
yarn add @chialab/esbuild-plugin-metadata -D
```

## Usage

```js
import esbuild from 'esbuild';
import metadataPlugin from '@chialab/esbuild-plugin-metadata';

await esbuild.build({
    plugins: [
        metadataPlugin({
            entrypoints: {
                metafilePath: 'build/metafile.json',
                manifestPath: 'build/manifest.json',
                entrypointsPath: 'build/entrypoints.json',
            },
        }),
    ],
});
```

---

## License

**esbuild-plugin-metadata** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-metadata/LICENSE) license.
