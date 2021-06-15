# Building ESM and CJS modules

Transpiling and bundling JavaScript files has been the main cause of headaches in the JavaScript ecosystem for long time. Tools were necessarily complicated because they had to handle a lot of cases and very different environments.

Now, thanks to the wide support of modern features in browsers and the landing of ES modules in Node we can finally simplify tasks, configurations and workflows.

Using [esbuild](https://esbuild.github.io/) under the hood, RNA combines the fater JavaScript/TypeScript compiler out there with a bunch of plugins for assets management, env variables injection and JSX pragma auto import.

## Setup

In order to bundle a JS module using RNA you may have to install the bundler:

```sh
$ npm i -D @chialab/rna @chialab/rna-bundler
$ yarn add -D @chialab/rna @chialab/rna-bundler
```

and run:

```sh
$ npx rna build src/index.js --output public/index.js
$ yarn rna build src/index.js --output public/index.js
```

This will generate a ESM bundle at the `--output` destination. Using `--format` and `--platform` flags we can generate multiple bundles that targets both browser and Node environments.

## Bundling for the browser

TODO

## Bundling for Node

TODO

## Dynamic import and code splitting

TODO

## ENV variables

TODO

## Assets management

TODO

## JSX

TODO

## TypeScript

TODO

## Targeting ES5

TODO

---

## Recommendations
