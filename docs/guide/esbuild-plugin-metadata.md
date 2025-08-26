# esbuild-plugin-metadata

Write a entrypoints.json manifest for esbuild builds.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-metadata
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-metadata
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-metadata
```

:::

## Usage

```ts
import metadataPlugin from '@chialab/esbuild-plugin-metadata';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [
        metadataPlugin({
            entrypoints: {
                metafilePath: 'webroot/metafile.json',
                manifestPath: 'webroot/manifest.json',
                entrypointsPath: 'webroot/entrypoints.json',
            },
        }),
    ],
});
```

::: code-group

```json[webroot/entrypoints.json]
{
    "index": {
        "format": "esm",
        "js": ["http://localhost:3000/__web-dev-server__web-socket.js", "http://localhost:3000/index.js"],
        "css": ["http://localhost:3000/index.css"]
    }
}
```

:::

Then, you can read this file and load resources in your PHP application:

```twig
{% set entrypoints = 'webroot/entrypoints.json'|file_get_content|json_decode %}
{% for script in entrypoints.index.js %}
    <script type="module" src="{{ script }}"></script>
{% endfor %}
{% for link in entrypoints.index.css %}
    <link rel="stylesheet" href="{{ link }}">
{% endfor %}
```

Here is a list of RNA-based helpers for common frameworks:

- [RNA CakePHP](https://github.com/chialab/rna-cakephp)
