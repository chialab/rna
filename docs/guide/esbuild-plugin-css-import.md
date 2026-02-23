# esbuild-plugin-css-import

Resolve CSS imports using the node resolution algorithm and the `style` field in package.json.

::: danger

This plugin development is deprecated and discontinued, as we are moving away from the custom `style` resolution field in package.json in favor of the `./style` export specifier.

:::

## Why

CSS modules resolution is not standardized, so it's not possible to natively import CSS files from `node_modules/` using the `@import` statement.

This plugin enables the node resolution algorithm for CSS files. That means that `@import` and `@url()` statements can refer to both relative files and NPM packages. CSS modules must have the `style` field in their package.json in order to correctly pickup the CSS entrypoint.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/esbuild-plugin-css-import
```

```sh[yarn]
yarn add -D @chialab/esbuild-plugin-css-import
```

```sh[pnpm]
pnpm add -D @chialab/esbuild-plugin-css-import
```

:::

## Usage

```ts
import cssImportPlugin from '@chialab/esbuild-plugin-css-import';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [cssImportPlugin()],
});
```

### Example

::: code-group

```css[src/main.css]
@import 'toggle';

body {
    color: var(--accent-color);
}
```

```json[node_modules/toggle/package.json]
{
    "name": "toggle",
    "main": "index.js",
    "style": "index.css",
    "exports": {
        ".": {
            "style": "./index.css",
            "default": "./index.js"
        }
    }
}
```

```css[node_modules/toggle/index.css]
:root {
    --accent-color: #000;
}
```

:::
