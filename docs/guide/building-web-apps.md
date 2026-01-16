::: danger

RNA cli development is deprecated and discontinued. It's recommended to use RNA plugins directly in your projects using vite, esbuild, or other supported tools.

:::

# Building web apps

Esbuild supports out of the box bundling for JavaScript and CSS. RNA introduces a plugin for HTML entrypoints in order to bundle Single Page Applications collecting scripts, styles, assets, icons and manifest. JavaScript and CSS sources are bundled the same way as they are used as entrypoints.

## Setup

In order to bundle a Single Page Application using RNA you may have to install the bundler:

::: code-group

```sh[npm]
npm i -D @chialab/rna
```

```sh[yarn]
yarn add -D @chialab/rna
```

```sh[pnpm]
pnpm add -D @chialab/rna
```

:::

and run:

::: code-group

```sh[npm]
npx rna build src/index.html --output public
```

```sh[yarn]
yarn rna build src/index.html --output public
```

```sh[pnpm]
pnpx rna build src/index.html --output public
```

:::

## Collecting scripts

Scripts are bundled following the conventions describe in the [Building JavaScript](./building-javascript) page.  
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
<script
    type="module"
    src="js/index.js"></script>
```

External files are regularly bundled, while inline scripts are loaded and builded as virtual modules. At the end, the will both result in externally loaded `esm` modules and `es2017` target:

```html
<script
    type="module"
    src="js/inline-XXXXXX.js"></script>
<script
    type="module"
    src="js/index-XXXXXX.js"></script>
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

Styles can be imported as file using a `<link rel="stylesheet">` or inlined using the `style` tag. Both will resolve `@import` statements and collect `url()` files, following the conventions describe in the [Building CSS](./building-css) page.

For example:

```html
<link
    rel="stylesheet"
    href="style/style.css" />

<style>
    @import url('normalize.css');

    .scale {
        transform: scale(2);
    }
</style>
```

will output

```html
<link
    rel="stylesheet"
    href="style/style-XXXXX.css" />

<style>
    body {
        margin: 0;
        padding: 0;
    }

    /* other stuff */

    .scale {
        transform: scale(2);
        -webkit-transform: scale(2);
    }
</style>
```

## Icons

Browsers have various support for favicons and _added-to-home_ websites. If a `rel="icon"` is defined in the HTML file, RNA will generate common icon files as well as their references:

```html
<link
    rel="icon"
    href="icon.png" />
```

becomes

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
```

You can also instruct RNA to generate iOS launch screens using the icon by adding the `apple-touch-startup-image` to the rel list:

```html
<link
    rel="icon apple-touch-startup-image"
    href="icon.png" />
```

adds

```html
<link
    rel="apple-touch-startup-image"
    media="..."
    href="icons/apple-launch-iphonex.png" />
<link
    rel="apple-touch-startup-image"
    media="..."
    href="icons/apple-launch-iphone8.png" />
<link
    rel="apple-touch-startup-image"
    media="..."
    href="icons/apple-launch-iphone8-plus.png" />
<link
    rel="apple-touch-startup-image"
    media="..."
    href="icons/apple-launch-iphone5.png" />
<link
    rel="apple-touch-startup-image"
    media="..."
    href="icons/apple-launch-ipadair.png" />
<link
    rel="apple-touch-startup-image"
    media="..."
    href="icons/apple-launch-ipadpro10.png" />
<link
    rel="apple-touch-startup-image"
    media="..."
    href="icons/apple-launch-ipadpro12.png" />
```

## Web manifest

RNA can update a [Web manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) (`rel="manifest"`) using HTML data.

If the referenced manifest does not exists, RNA will start from a blank JSON file. Otherwise, it will update only missing fields.

```html
<link
    rel="manifest"
    href="app.webmanifest" />
```

::: code-group

```js[app.webmanifest]
{
    name,             // <title></title>
    description,      // <meta name="description" content="">
    start_url,        // <base href="">
    scope,            // <base href="">
    display,          // standalone
    orientation,      // any
    theme_color,      // <meta name="theme" content="">
    background_color, // #fff
    lang,             // <html lang="">
    icons,            // <link rel="icon" href="">
}
```

:::
