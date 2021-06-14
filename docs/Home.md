**RNA** is a set of plugins for popular bundlers, servers and test runners. It can be used programmatically in your configuration or via the pluggable `rna` cli.

### 📦 Transpiling and bundling

The RNA ecosystem is heavily based on [esbuild](https://esbuild.github.io/), *an extremely fast JavaScript bundler* that supports TypeScript and CSS out of the box. Thanks to its plugin system, we added support for:

* **HTML entrypoints.** Using a `index.html` file as build entrypoint, you can bundle full web applications. RNA will bundle and transpile referenced scripts and styles, along with copying external file resources and generating webmanifest and favicons.
* **Assets managment.** Collect files in your scripts using standard syntax and `URL` references.
* **CSS postprocessing.** If the project provides a configuration, any CSS file will be transformed by PostCSS.
* **CSS in node modules.** Import CSS dependencies from the node_modules folder using the node resolution algorithm and looking for the `style` field in package.json.
* **ES5 support.** Esbuild does not support lowering to ES5 syntax, that's why RNA provides a Babel plugin and beta SWC support.

### 🚀 Development server

Build plugins are also available for a dev web server based on the Web Dev Server project. Since WDS and RNA philosophy is to use standard syntax and practises in web projects, you can run a local server with hot module replacement and CSS livereload without have to bundle your web app first or to re-run a partial build for each change. Files loaded via ESM will pass through a little esbuild transpilation in order to support TypeScript syntax and node resolution, making a great difference in developer experience. The dev server can be used also for PHP with an Encore-like approach.

### 🧭 Tests in the browser

TODO

### 🎛 Tests in Node

TODO

## Quick usage

```sh
$ npm i -D \
    @chialab/rna \
    @chialab/rna-bundler \
    @chialab/rna-dev-server \
    @chialab/rna-browser-test-runner
```

**package.json**
```json
{
    "scripts": {
        "start": "rna serve src --port 3000",
        "build": "rna build src/index.html --output public",
        "test": "rna test:browser 'test/**/*.spec'"
    }
}

