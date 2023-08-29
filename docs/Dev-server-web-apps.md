# Dev server for web apps

The [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/) is a server thought for web dev environments. It loads JavaScript modules without the need of a bundler, and it execs a little number of transformation in order to provide a great experience.

## Features

**From WDS**: 

* Cold start
* Transform TypeScript, JSX and proposal via esbuild
* Node modules resolution
* Auto reload on change
* Hot Module Replacement ([esm-hmr proposal](https://github.com/snowpackjs/esm-hmr))
* SPA routing

**From RNA**:

* CSS live reload
* CSS `@import` modules resolution
* cjs to esm converter on the fly

## Setup

The RNA dev server can be installed with the following preset:

```sh
npm i -D @chialab/rna
```

```sh
yarn add -D @chialab/rna
```

Run the dev server:

```sh
npx rna serve src
```

```sh
yarn rna serve src
```

You can also specify a custom port using the `--port N` flag.

## Legacy browsers

Sometimes you may need to test on legacy browsers. Since the Dev Server is based on ESM support, in order to work in Internet Explorer or Safari 9 it needs to transpile and convert the module system.  
Installing the [legacy plugin](https://www.npmjs.com/package/@chialab/wds-plugin-legacy) will enable the convertion of ESM modules to [SystemJS](https://github.com/systemjs/systemjs) and it will inject required polyfills for `Promise` and `fetch`.

```sh
npm i -D @chialab/wds-plugin-legacy
```

```sh
yarn add -D @chialab/wds-plugin-legacy
```

## Dev server as service

The Dev Server can be used as a service for other stacks. The `serve` command loads a RNA config object (using the `--config` flag or looking for `rna.config.js` file in the project) and reads the `entrypoints` option in order to generate a JSON files with all the required references.

For example, the following configuration:

```ts
export default {
    entrypoints: [
        { input: 'webroot/index.js' },
        { input: 'webroot/index.css' },
    ],
    format: 'esm',
    entrypointsPath: 'webroot/entrypoints.json',
}
```

```sh
npx rna serve --port 3000
```

```sh
yarn rna serve --port 3000
```

will generate the **webroot/entrypoints.json** file with contents:

```json
{
    "index": {
        "format": "esm",
        "js": [
            "http://localhost:3000/__web-dev-server__web-socket.js",
            "http://localhost:3000/index.js"
        ],
        "css": [
            "http://localhost:3000/index.css"
        ]
    }
}
```

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

* [RNA CakePHP](https://github.com/chialab/rna-cakephp)
