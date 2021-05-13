<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA</strong> • A bundler, a server and a test runner for modern modules and applications.
</p>

---

## Quick usage

```sh
$ npm i @chialab/rna -D
$ yarn add @chialab/rna -D
```

**package.json**
```json
{
    "scripts": {
        "start": "rna serve src --port 3000",
        "build": "rna build src/index.html --output public",
        "test": "rna test 'test/**/*.spec'"
    }
}
```

See more [here](./packages/rna).

---

## Packages

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
| [@chialab/esbuild-plugin-require-resolve](./packages/esbuild-plugin-require-resolve) | A file loader plugin for esbuild for require.resolve statements. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-require-resolve" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-require-resolve) |
| [@chialab/esbuild-plugin-swc](./packages/esbuild-plugin-swc) | A pluggable esbuild plugin that runs swc for es5 transpilation. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-swc" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-swc) |
| [@chialab/esbuild-plugin-transform](./packages/esbuild-plugin-transform) | Pipe transformation plugin for esbuild. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-transform" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-transform) |
| [@chialab/esbuild-plugin-webpack-include](./packages/esbuild-plugin-webpack-include) | A plugin for esbuild that converts the webpackInclude syntax. | [<img src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-webpack-include" alt="npm" />](https://www.npmjs.com/package/@chialab/esbuild-plugin-webpack-include) |
| [@chialab/postcss-preset-chialab](./packages/postcss-preset-chialab) | The postcss preset used by Chialab. | [<img src="https://img.shields.io/npm/v/@chialab/postcss-preset-chialab" alt="npm" />](https://www.npmjs.com/package/@chialab/postcss-preset-chialab) |
| [@chialab/rna](./packages/rna) | A bundler, a server and a test runner for modern modules and applications. | [<img src="https://img.shields.io/npm/v/@chialab/rna" alt="npm" />](https://www.npmjs.com/package/@chialab/rna) |
| [@chialab/rna-browser-test-runner](./packages/rna-browser-test-runner) | A test runner for browsers based on Web Test Runner. | [<img src="https://img.shields.io/npm/v/@chialab/rna-browser-test-runner" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-browser-test-runner) |
| [@chialab/rna-bundler](./packages/rna-bundler) | A JavaScript, CSS and HTML bundler based on esbuild. | [<img src="https://img.shields.io/npm/v/@chialab/rna-bundler" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-bundler) |
| [@chialab/rna-node-test-runner](./packages/rna-node-test-runner) | A test runner for node based on mocha. | [<img src="https://img.shields.io/npm/v/@chialab/rna-node-test-runner" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-node-test-runner) |
| [@chialab/rna-web-server](./packages/rna-web-server) | A webapp server based on Web Dev Server. | [<img src="https://img.shields.io/npm/v/@chialab/rna-web-server" alt="npm" />](https://www.npmjs.com/package/@chialab/rna-web-server) |
| [@chialab/swc-plugin-htm](./packages/swc-plugin-htm) | A swc plugin for htm literals transpiling. | [<img src="https://img.shields.io/npm/v/@chialab/swc-plugin-htm" alt="npm" />](https://www.npmjs.com/package/@chialab/swc-plugin-htm) |
| [@chialab/swc-types](./packages/swc-types) | A babel/types-like set of helpers for swc. | [<img src="https://img.shields.io/npm/v/@chialab/swc-types" alt="npm" />](https://www.npmjs.com/package/@chialab/swc-types) |
| [@chialab/wds-plugin-commonjs](./packages/wds-plugin-commonjs) | A commonjs to esm transformer for the web dev server. | [<img src="https://img.shields.io/npm/v/@chialab/wds-plugin-commonjs" alt="npm" />](https://www.npmjs.com/package/@chialab/wds-plugin-commonjs) |
| [@chialab/wds-plugin-hmr-css](./packages/wds-plugin-hmr-css) | Enable CSS hmr for the web dev server. | [<img src="https://img.shields.io/npm/v/@chialab/wds-plugin-hmr-css" alt="npm" />](https://www.npmjs.com/package/@chialab/wds-plugin-hmr-css) |
| [@chialab/wds-plugin-polyfill](./packages/wds-plugin-polyfill) | Inject polyfills to HTML responses served by the web dev server. | [<img src="https://img.shields.io/npm/v/@chialab/wds-plugin-polyfill" alt="npm" />](https://www.npmjs.com/package/@chialab/wds-plugin-polyfill) |
| [@chialab/wds-plugin-postcss](./packages/wds-plugin-postcss) | A CSS loader plugin for the Web Dev Server that uses postcss as preprocessor. | [<img src="https://img.shields.io/npm/v/@chialab/wds-plugin-postcss" alt="npm" />](https://www.npmjs.com/package/@chialab/wds-plugin-postcss) |

---

## License

RNA is released under the [MIT](https://github.com/chialab/rna/blob/master/LICENSE) license.
