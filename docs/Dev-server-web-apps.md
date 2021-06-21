# Dev server for web apps

The [`Web Dev Server`](https://modern-web.dev/docs/dev-server/overview/) is a server thought for web dev environments. It loads JavaScript modules without the need of a bundler, and it execs a little number of transformation in order to provide a great experience. Node modules are resolved, TypeScript informations are removed and cjs modules are transformed on the fly to be esm compliant.

The server starts immediatly and support the snowpack's proposal for hot module reloading (HMR) based on esm modules.

Beside the cjs converter, RNA plugs some other useful modules, such as CSS live reloading, automatic polyfill injection, CSS @import from node modules.

## Setup

The RNA dev server can be installed with the following preset:

```sh
$ npm i -D @chialab/rna @chialab/rna-dev-server
$ yarn add -D @chialab/rna @chialab/rna-dev-server
```

The dev server can serve a folder with history mode enabled (it will always resolve to the root index.html for unknown resources):

```sh
$ npx serve src
$ yarn serve src
```

You can also specify a custom port using the `--port N` flag.

## Legacy browsers

TODO

##  Dev server as service

TODO
