<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA</strong> • A bundler, a server and a test runner for modern modules and applications.
</p>

---

⚡️ Transpile and bundle JavaScript, TypeScript, JSX, CSS and HTML with [esbuild](https://esbuild.github.io/).

🧭 Serve unbundled modules on demand with livereload and HMR using the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/).

🦠 Run tests in browser and node environments using the [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) and [Mocha](https://mochajs.org/).

📺 Legacy support with [Babel](https://babeljs.io/) and [PostCSS](https://postcss.org/).

---

## Quick usage

Full documentation at [Chialab.io](https://www.chialab.io/p/rna) and [Github Wiki](https://github.com/chialab/rna/wiki).

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
```

Read more about the [cli module](./packages/rna).

---

## Packages

The RNA ecosystem provides a set of plugins and addons for core tools designed to be used even outside the `rna` cli.

| **Package** | **Description** | **Version** |
| ----------- | --------------- | --------------- |
| [@chialab/cjs-to-esm](./packages/cjs-to-esm) | A commonjs to esm converter. | [<img src="https://img.shields.io/npm/v/@chialab/cjs-to-esm" alt="npm" />](https://www.npmjs.com/package/@chialab/cjs-to-esm) |
| [@chialab/esbuild-plugin-alias](./packages/esbuild-plugin-alias) | A plugin for esbuild that resolves aliases or empty modules. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-alias" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-alias) |
| [@chialab/esbuild-plugin-any-file](./packages/esbuild-plugin-any-file) | A loader plugin for esbuild for files with unknown loader. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-any-file" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-any-file) |
| [@chialab/esbuild-plugin-babel](./packages/esbuild-plugin-babel) | A pluggable esbuild plugin that runs babel for es5 transpilation. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-babel" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-babel) |
| [@chialab/esbuild-plugin-commonjs](./packages/esbuild-plugin-commonjs) | A commonjs to esm converter for esbuild. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-commonjs" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-commonjs) |
| [@chialab/esbuild-plugin-env](./packages/esbuild-plugin-env) | Define all environement variables for esbuild. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-env" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-env) |
| [@chialab/esbuild-plugin-html](./packages/esbuild-plugin-html) | A HTML loader plugin for esbuild. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-html" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-html) |
| [@chialab/esbuild-plugin-meta-url](./packages/esbuild-plugin-meta-url) | A file loader plugin for esbuild for constructed URLs using import metadata. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-meta-url" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-meta-url) |
| [@chialab/esbuild-plugin-postcss](./packages/esbuild-plugin-postcss) | A CSS loader plugin for esbuild that uses postcss as preprocessor. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-postcss" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-postcss) |
| [@chialab/esbuild-plugin-transform](./packages/esbuild-plugin-transform) | Pipe transformation plugin for esbuild. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-transform" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-transform) |
| [@chialab/esbuild-plugin-webpack-include](./packages/esbuild-plugin-webpack-include) | A plugin for esbuild that converts the webpackInclude syntax. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-webpack-include" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-webpack-include) |
| [@chialab/estransform](./packages/estransform) | Execute multiple transformations on JavaScript sources with full sourcemaps support. | [<img src="https://img.shields.io/npm/v/@chialab/estransform" alt="npm" />](https://www.npmjs.com/package/@chialab/estransform) |
| [@chialab/node-resolve](./packages/node-resolve) | A promise based node resolution library based on enhanced-resolve. | [<img src="https://img.shields.io/npm/v/@chialab/node-resolve" alt="npm" />](https://www.npmjs.com/package/@chialab/node-resolve) |
| [@chialab/postcss-preset-chialab](./packages/postcss-preset-chialab) | The postcss preset used by Chialab. | [<img src="https://img.shields.io/npm/v/@chialab/postcss-preset-chialab" alt="npm" />](https://www.npmjs.com/package/@chialab/postcss-preset-chialab) |
| [@chialab/postcss-url-rebase](./packages/postcss-url-rebase) | A postcss plugin for url() rebasing before import. | [<img src="https://img.shields.io/npm/v/@chialab/postcss-url-rebase" alt="npm" />](https://www.npmjs.com/package/@chialab/postcss-url-rebase) |
| [@chialab/rna](./packages/rna) | A bundler, a server and a test runner for modern modules and applications. | [<img src="https://img.shields.io/npm/v/@chialab/rna" alt="npm" />](https://www.npmjs.com/package/@chialab/rna) |
| [@chialab/rna-apidoc](./packages/rna-apidoc) | Generate api documentation using TypeScript symbols. | [<img src="https://img.shields.io/npm/v/@chialab/rna-apidoc" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-apidoc) |
| [@chialab/rna-browser-test-runner](./packages/rna-browser-test-runner) | A test runner for browsers based on Web Test Runner. | [<img src="https://img.shields.io/npm/v/@chialab/rna-browser-test-runner" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-browser-test-runner) |
| [@chialab/rna-bundler](./packages/rna-bundler) | A JavaScript, CSS and HTML bundler based on esbuild. | [<img src="https://img.shields.io/npm/v/@chialab/rna-bundler" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-bundler) |
| [@chialab/rna-node-test-runner](./packages/rna-node-test-runner) | A test runner for node based on mocha. | [<img src="https://img.shields.io/npm/v/@chialab/rna-node-test-runner" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-node-test-runner) |
| [@chialab/rna-saucelabs-test-runner](./packages/rna-saucelabs-test-runner) | A test runner for Saucelabs based on on Web Test Runner. | [<img src="https://img.shields.io/npm/v/@chialab/rna-saucelabs-test-runner" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-saucelabs-test-runner) |
| [@chialab/rna-dev-server](./packages/rna-dev-server) | A webapp server based on Web Dev Server. | [<img src="https://img.shields.io/npm/v/@chialab/rna-dev-server" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-dev-server) |
| [@chialab/wds-plugin-hmr-css](./packages/wds-plugin-hmr-css) | Enable CSS hmr for the web dev server. | [<img src="https://img.shields.io/npm/v/@chialab/wds-plugin-hmr-css" alt="npm" />](https://www.npmjs.com/package/@chialab/wds-plugin-hmr-css) |
| [@chialab/wds-plugin-legacy](./packages/wds-plugin-legacy) | Transform esm modules served by the web dev server into SystemJS modules for legacy browser compatibility. | [<img src="https://img.shields.io/npm/v/@chialab/wds-plugin-legacy" alt="npm" />](https://www.npmjs.com/package/@chialab/wds-plugin-legacy) |
| [@chialab/wds-plugin-polyfill](./packages/wds-plugin-polyfill) | Inject polyfills to HTML responses served by the web dev server. | [<img src="https://img.shields.io/npm/v/@chialab/wds-plugin-polyfill" alt="npm" />](https://www.npmjs.com/package/@chialab/wds-plugin-polyfill) |
| [@chialab/wtr-mocha-reporter](./packages/wtr-mocha-reporter) | A Mocha reporter interface for the Web Test Runner. | [<img src="https://img.shields.io/npm/v/@chialab/wtr-mocha-reporter" alt="npm" />](https://www.npmjs.com/package/@chialab/wtr-mocha-reporter) |

---

## License

RNA is released under the [MIT](https://github.com/chialab/rna/blob/master/LICENSE) license.
