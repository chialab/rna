**RNA** is a set of plugins for popular bundlers, servers and test runners. It can be used programmatically in your configuration or via the pluggable `rna` cli.

### Transpile and bundle JavaScript, TypeScript, JSX, CSS and HTML

The RNA ecosystem is heavily based on [esbuild](https://esbuild.github.io/), *an extremely fast JavaScript bundler* that supports TypeScript and CSS out of the box. Thanks to its plugin system, we added support for:

* **HTML entrypoints.** Using a `index.html` file as build entrypoint, you can bundle full web applications. RNA will bundle and transpile referenced scripts and styles, along with copying external file resources and generating webmanifest and favicons.
* **Assets managment.** Collect files in your scripts using standard syntax and `URL` references.
* **CSS in node modules.** Import CSS dependencies from the node_modules folder using the node resolution algorithm and looking for the `style` field in package.json.

### Serve unbundled modules on demand with livereload and HMR

Build plugins are also available for the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/). Since WDS and [RNA philosophy](./Architecture) is to use standard syntax and practises in web projects, you can run a local server with hot module replacement and CSS livereload without have to bundle your web app first or to re-run a partial build for each change. Files loaded via ESM will pass through a little esbuild transpilation in order to support TypeScript, CommonJS modules and node resolution, making a great difference in developer experience. The dev server can be used also for PHP with an Encore-like approach.

### Run tests in browser and node environments

Built on the Web Dev Server, a configured instance of the [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) is also available for browsers. It comes with coverage and on-the-fly legacy browsers support. The test runner works great with the [`@open-wc/testing`](https://www.npmjs.com/package/@open-wc/testing) and [`@testing-library/dom`](https://www.npmjs.com/package/@testing-library/dom) packages.

Since RNA aims to support both browser and Node modules, you can test your modules in Node environments using the RNA test runner based on [Mocha](https://mochajs.org/). Coverage is also available thanks to the v8 coverage tool.

### Legacy support

Esbuild does not support lowering to ES5 syntax, that's why RNA provides a [Babel](https://babeljs.io/). If the project provides a configuration, any CSS file will also be transformed using [PostCSS](https://postcss.org/).

---

## Quick usage

[<img src="https://img.shields.io/npm/v/@chialab/rna" alt="npm" />](https://www.npmjs.com/package/@chialab/rna)

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

