<p align="center">
    <strong>Esbuild Plugin HTML</strong> • A HTML loader plugin for <a href="https://esbuild.github.io/">esbuild</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-html"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-html.svg?style=flat-square"></a>
</p>

---

## How it works

**Esbuild Plugin HTML** instructs esbuild to load a HTML file as entrypoint. It parses the HTML and runs esbuild on scripts, styles, assets and icons.

### Scripts

It handles both inline and file scripts. When the `type="module"` attribute is found in the `<script>` tag, it runs esbuild with `format: 'esm'`, otherwise it will produce an `iife` bundle.

**Sample**

```html
<script src="src/index.js" type="module"></script>
<script src="src/index.js" nomodule></script>
```

This will result in producing two bundles:

```html
<script src="esm/index-[hash].js" type="module"></script>
<script src="iife/index-[hash].js" nomodule></script>
```

### Styles

It supports both `<link rel="stylesheet">` and `<style>` nodes for styling.

**Sample**

```html
<link rel="stylesheet" href="app.css" />
<style>
    .inline {
        color: red;
    }
</style>
```

This will result in producing two css bundles:

```html
<link rel="stylesheet" href="css/app-[hash].css" />
<style>@import url('css/inline-[hash].css');</style>
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
<link rel="shortcut icon" href="icon.png" type="image/png">
```

This will result in:

```html
<link rel="icon" sizes="16x16" href="icons/favicon-16x16.png">
<link rel="icon" sizes="32x32" href="icons/favicon-32x32.png">
<link rel="icon" sizes="48x48" href="icons/favicon-48x48.png">
<link rel="shortcut icon" href="icons/favicon-196x196.png">
<link rel="icon" sizes="196x196" href="icons/favicon-196x196.png">
<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
<link rel="apple-touch-icon" sizes="167x167" href="icons/apple-touch-icon-ipad.png">
<link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="icons/apple-launch-iphonex.png">
<link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="icons/apple-launch-iphone8.png">
<link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" href="icons/apple-launch-iphone8-plus.png">
<link rel="apple-touch-startup-image" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" href="icons/apple-launch-iphone5.png">
<link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="icons/apple-launch-ipadair.png">
<link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" href="icons/apple-launch-ipadpro10.png">
<link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="icons/apple-launch-ipadpro12.png">
```

It also update `<link rel="manifest">` content if found.

---

## Install

```sh
$ npm i @chialab/esbuild-plugin-html -D
$ yarn add @chialab/esbuild-plugin-html -D
```

## Usage

```js
import esbuild from 'esbuild';
import htmlPlugin from '@chialab/esbuild-plugin-html';

await esbuild.build({
    plugins: [
        htmlPlugin({
            // scriptsTarget: 'es6',
            // modulesTarget: 'es2020',
        }),
    ],
});
```

### Options

The HTML plugin accepts an options object with the following properties:

#### `scriptsTarget`

The target of the plain scripts build (`type="text/javascript"`).

#### `modulesTarget`

The target of the ES modules build (`type="module"`).

---

## License

**Esbuild Plugin HTML** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-html/LICENSE) license.
