# RNA

## RNA is a build framework

We built RNA to be pluggable and to be interoperable with other build systems. A lot of esbuild and postcss plugins are distribuited as standalone packages in order to be reused outside the RNA opinionated ecosystem. We also designed a micro-sdk for esbuild plugin authors that handles transform pipelines and emits chunks or files.

- [Architecture](https://chialab.github.io/rna/guide/architecture.html)

## RNA is a bundler

RNA bundler is heavily based on [esbuild](https://esbuild.github.io/), _an extremely fast JavaScript bundler_ with some pre-configured addons. It can bundle and optimize JavaScript, TypeScript, JSX, CSS and HTML and collect referenced assets just using languages features.

The bundler is designed for modern browsers, but it can transpile code for IE11 and other legacy browsers with [Babel](https://babeljs.io/) and [PostCSS](https://postcss.org/) plugins.

- [Build a JavaScript module](https://chialab.github.io/rna/guide/building-javascript.html)
- [Build a CSS module](https://chialab.github.io/rna/guide/building-css.html)
- [Build a Web App](https://chialab.github.io/rna/guide/building-web-apps.html)

## RNA is a dev server

Build plugins are also available for the [Web Dev Server](https://modern-web.dev/docs/dev-server/overview/). Since both WDS and RNA aim to use standard syntax and practises in web projects, you can run a local server with hot module replacement and CSS livereload without have to bundle your web app first or to re-run a partial build for each change. Files loaded via ESM will pass through a little esbuild transpilation in order to support TypeScript, CommonJS modules and node resolution, making a great difference in developer experience. The dev server can be used also for PHP with an Encore-like approach.

- [Dev server for web apps](https://chialab.github.io/rna/guide/dev-server.html)

## RNA is a cli

### Quick usage

```sh
npm i -D @chialab/rna
```

**package.json**

```json
{
    "scripts": {
        "start": "rna serve src --port 3000",
        "build": "rna build src/index.html --output public"
    }
}
```

### Tutorials

- [Migrate Create React App to RNA](https://chialab.github.io/rna/guide/migrate-CRA.html)

---

## License

RNA is released under the [MIT](https://github.com/chialab/rna/blob/main/LICENSE) license.
