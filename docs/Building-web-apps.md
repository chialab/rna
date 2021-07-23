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

There are two kinds of script: plain and module.

**Module scripts** can use ESM import/export statements and they are referenced in the HTML file using a script with `type="module"`. Source can be inline:

```html
<script type="module">
    import { route } from 'router';

    route('/profile', () => {});
</script>
```

or external:

```html
<script type="module" src="js/index.js"></script>
```

External files are regularly bundled, while inline scripts are loaded and builded as virtual modules. At the end, the will both result in externally loaded `esm` modules and `es2017` target:

```html
<script type="module" src="js/inline-XXXXXX.js"></script>
<script type="module" src="js/index-XXXXXX.js"></script>
```

**Plain scripts** can also be inlined:

```html
<script>
    $('#app').html('Loading...');
</script>
```

or a file reference:

```html
<script src="js/index.js"></script>
```

Plain scripts will output using `iife` format and `es5` target if the `@chialab/esbuild-plugin-babel` module is installed, and they will be respectively inlined or referenced.

## Collecting styles

## Icons

## Webmanifest
