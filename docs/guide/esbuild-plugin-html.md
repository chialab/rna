# esbuild-plugin-html

A HTML loader plugin for [esbuild](https://esbuild.github.io/).

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-html
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-html
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-html
```

:::

## Usage

The plugin tries to respect esbuild configuration closely as possible. Since it treats HTML files as entrypoints, the resulting documents will use the pattern provided by `entryNames`, while JavaScript and CSS files will be written using the `chunkNames` config. Other files use the `assetNames` option.

### Common configurations

#### Build mode

```js
import htmlPlugin from '@chialab/esbuild-plugin-html';
import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['src/index.html'],
    outdir: 'public',
    assetNames: 'assets/[name]-[hash]',
    chunkNames: '[ext]/[name]-[hash]',
    plugins: [htmlPlugin()],
});
```

The output structure would be something similar to:

```
public
├── index.html
├── assets/favicon-YYYYY.png
├── css/style-YYYYY.css
├── css/style-YYYYY.css.map
├── js/index-YYYYY.js
└── js/index-YYYYY.js.map
```

#### Serve mode

```js
import htmlPlugin from '@chialab/esbuild-plugin-html';
import esbuild from 'esbuild';

await esbuild.serve(
    {
        servedir: 'public',
    },
    {
        entryPoints: ['src/index.html'],
        outdir: 'public',
        assetNames: 'assets/[name]',
        chunkNames: '[ext]/[name]',
        plugins: [htmlPlugin()],
    }
);
```

### Options

The HTML plugin accepts an options object with the following properties:

#### `scriptsTarget`

The target of the plain scripts build (`type="text/javascript"`).

#### `modulesTarget`

The target of the ES modules build (`type="module"`).

## How it works

**Esbuild Plugin HTML** instructs esbuild to load a HTML file as entrypoint. It parses the HTML and runs esbuild on scripts, styles, assets and icons.

### Scripts

It handles both inline and file scripts. When the `type="module"` attribute is found in the `<script>` tag, it runs esbuild with `format: 'esm'`, otherwise it will produce an `iife` bundle.

**Sample**

```html
<script
    src="src/index.js"
    type="module"></script>
<script
    src="src/index.js"
    nomodule></script>
```

This will result in producing two bundles:

```html
<script
    src="index-[hash].js"
    type="module"></script>
<script
    src="index-[hash].js"
    nomodule></script>
```

### Styles

It supports both `<link rel="stylesheet">` and `<style>` nodes for styling.

**Sample**

```html
<link
    rel="stylesheet"
    href="app.css" />
<style>
    .inline {
        color: red;
    }
</style>
```

This will result in producing two css bundles:

```html
<link
    rel="stylesheet"
    href="css/app-[hash].css" />
<style>
    @import url('css/inline-[hash].css');
</style>
```

### Assets

Referenced files by `src` and `href` attributes are copy along the html file in the `assets` directory.

**Sample**

```html
<img src="img/logo.png" />
```

This will result in:

```html
<img src="assets/logo-[hash].png" />
```

### Icons

Manually generate favicons can be a pain. This plugin detects a `<link rel="icon">` node and uses its reference to generate icons and launch screens for (almost) every browser.

**Sample**

```html
<link
    rel="shortcut icon"
    href="icon.png"
    type="image/png" />
```

This will result in:

```html
<link
    rel="icon"
    sizes="16x16"
    href="icons/favicon-16x16.png" />
<link
    rel="icon"
    sizes="32x32"
    href="icons/favicon-32x32.png" />
<link
    rel="icon"
    sizes="48x48"
    href="icons/favicon-48x48.png" />
<link
    rel="shortcut icon"
    href="icons/favicon-196x196.png" />
<link
    rel="icon"
    sizes="196x196"
    href="icons/favicon-196x196.png" />
<link
    rel="apple-touch-icon"
    sizes="180x180"
    href="icons/apple-touch-icon.png" />
<link
    rel="apple-touch-icon"
    sizes="167x167"
    href="icons/apple-touch-icon-ipad.png" />
<link
    rel="apple-touch-startup-image"
    media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
    href="icons/apple-launch-iphonex.png" />
<link
    rel="apple-touch-startup-image"
    media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
    href="icons/apple-launch-iphone8.png" />
<link
    rel="apple-touch-startup-image"
    media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
    href="icons/apple-launch-iphone8-plus.png" />
<link
    rel="apple-touch-startup-image"
    media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
    href="icons/apple-launch-iphone5.png" />
<link
    rel="apple-touch-startup-image"
    media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
    href="icons/apple-launch-ipadair.png" />
<link
    rel="apple-touch-startup-image"
    media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)"
    href="icons/apple-launch-ipadpro10.png" />
<link
    rel="apple-touch-startup-image"
    media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
    href="icons/apple-launch-ipadpro12.png" />
```

It also update `<link rel="manifest">` content if found.

## Minify

The plugin will honor the `minify` option from esbuild if the `htmlnano` module is installed.

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-html htmlnano
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-html htmlnano
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-html htmlnano
```

:::

Configuration can be passed with the `minifyOptions` property. Please refer to the [htmlnano documentation](https://htmlnano.netlify.app/modules) for more information.

```js
import htmlPlugin from '@chialab/esbuild-plugin-html';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [
        htmlPlugin({
            minifyOptions: {
                collapseWhitespace: true,
            },
        }),
    ],
});
```
