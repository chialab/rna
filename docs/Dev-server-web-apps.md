# Dev server for web apps

The [`Web Dev Server`](https://modern-web.dev/docs/dev-server/overview/) is a server thought for web dev environments. It loads JavaScript modules without the need of a bundler, and it execs a little number of transformation in order to provide a great experience.

## Features

**From WDS**: 

* Cold start
* Transform TypeScript
* Node modules resolution
* Auto reload on change
* Hot Module Replacement support ([snowpack's esm-hmr](https://github.com/snowpackjs/esm-hmr))
* SPA routing

**From RNA**:

* CSS live reload
* CSS `@import` modules resolution
* cjs to esm converter on the fly

## Setup

The RNA dev server can be installed with the following preset:

```sh
$ npm i -D @chialab/rna @chialab/rna-dev-server
$ yarn add -D @chialab/rna @chialab/rna-dev-server
```

Run the dev server:

```sh
$ npx rna serve src
$ yarn rna serve src
```

You can also specify a custom port using the `--port N` flag.

## Legacy browsers

TODO

##  Dev server as service

TODO
