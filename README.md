<p align="center">
    <a href="https://www.chialab.io/p/rna">
        <img alt="RNA logo" width="144" height="144" src="https://raw.githack.com/chialab/rna/main/logo.svg" />
    </a>
</p>

<p align="center">
    <strong>RNA</strong>
</p>

---

## RNA is a bundler

RNA bundler is heavily based on [esbuild](https://esbuild.github.io/), *an extremely fast JavaScript bundler* with some pre-configured addons. It can bundle and optimize JavaScript, TypeScript, JSX, CSS and HTML and collect referenced assets just using languages features.

The bundler is designed for modern browsers, but it can transpile code for IE11 and other legacy browsers with [Babel](https://babeljs.io/) and [PostCSS](https://postcss.org/) plugins.

* [Build a JavaScript module](./docs/Building-javascript)
* [Build a CSS module](./docs/Building-css)
* [Build a Web App](./docs/Building-web-apps)

## RNA is a dev server

Build plugins are also available for the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/). Since WDS and [RNA philosophy](./Architecture) is to use standard syntax and practises in web projects, you can run a local server with hot module replacement and CSS livereload without have to bundle your web app first or to re-run a partial build for each change. Files loaded via ESM will pass through a little esbuild transpilation in order to support TypeScript, CommonJS modules and node resolution, making a great difference in developer experience. The dev server can be used also for PHP with an Encore-like approach.

* [Dev server for web apps](./docs/Dev-server-web-apps)

## RNA is a browser and node test runner

Built on the Web Dev Server, a configured instance of the [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) is also available for browsers. It comes with coverage and on-the-fly legacy browsers support.

Since RNA aims to support both browser and Node modules, you can test your modules in Node environments using the RNA test runner based on [Mocha](https://mochajs.org/). Coverage is also available thanks to the v8 coverage tool.

* [Testing in the browser](./docs/Testing-browser)
* [Testing in node](./docs/Testing-node)
* [Testing in SauceLabs](./docs/Testing-saucelabs)

## RNA is a build framework

We built RNA to be pluggable and to be interoperable with other build systems. A lot of esbuild and postcss plugins are distribuited as standalone packages in order to be reused outside the RNA opinionated ecosystem. We also designed a micro-sdk for esbuild plugin authors that handles transform pipelines and emits chunks or files.

* [List of modules](./docs/Plugins)
* [Write a plugin](./docs/Write-a-plugin)

## RNA is a cli

### Quick usage

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


---

## License

RNA is released under the [MIT](https://github.com/chialab/rna/blob/main/LICENSE) license.
