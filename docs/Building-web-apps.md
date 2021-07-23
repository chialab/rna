# Building web apps

Esbuild supports out of the box bundling for JavaScript and CSS. RNA introduces a plugin for HTML entrypoints in order to bundle Single Page Applications collecting scripts, styles, assets, icons and manifest. JavaScript and CSS sources are bundled the same way as they are used as entrypoints. 

## Setup

In order to bundle a Single Page Application using RNA you may have to install the bundler:

```sh
$ npm i -D @chialab/rna @chialab/rna-bundler @chialab/esbuild-plugin-html
$ yarn add -D @chialab/rna @chialab/rna-bundler @chialab/esbuild-plugin-html
```

and run:

```sh
$ npx rna build src/index.html --output public
$ yarn rna build src/index.html --output public
```

## Collecting scripts

## Collecting styles

## Icons

## Webmanifest
