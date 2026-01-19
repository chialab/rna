# CSS Modules plugin

A Vite plugin that turns

```ts
import styles from './file.css' with { type: 'css' };
```

into either a [constructable stylesheet](https://web.dev/articles/constructable-stylesheets) (CSSStyleSheet) (when supported) or the raw CSS string as a fallback — with optional enforcement of type="css" and smooth HMR behavior.

## Overview

Modern browsers support constructable stylesheets via `new CSSStyleSheet()` and `document.adoptedStyleSheets`, which enables:

- fast style application without injecting `<style>` tags
- cheap swaps on update (nice for HMR)
- easier style scoping / sharing patterns (especially in web components)

This plugin makes authoring simple: you keep importing plain `.css` files from JS/TS, and the plugin rewrites those imports so that:

- the CSS is bundled as an inline string (?inline)
- the module’s default export becomes:
    - a CSSStyleSheet instance (preferred, when available in the runtime), or
    - the original CSS string (fallback) for older browsers and Node.js environments

It also optionally supports a stricter mode where it only transforms CSS imports that explicitly declare `type="css"` in the import attributes.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vite-plugin-css-modules
```

```sh[yarn]
yarn add -D @chialab/vite-plugin-css-modules
```

```sh[pnpm]
pnpm add -D @chialab/vite-plugin-css-modules
```

:::

## Configuration

Add the plugin to your Vite config:

::: code-group

```ts[vite.config.ts]
import cssModulesPlugin from '@chialab/vite-plugin-css-modules';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    cssModulesPlugin({
      checkAttribute: false,
      include: '**/*.{js,jsx,ts,tsx}',
    }),
  ],
});
```

```ts[tsconfig.json]
{
  "compilerOptions": {
    "types": ["@chialab/vite-plugin-css-modules/vite"]
  }
}
```

:::

### Options

#### checkAttribute

Type: `boolean`  
Default: `true`

If `true`, only imports with `with { type: 'css' }` will be transformed. If `false`, all `.css` imports in the `include` option will be transformed.

::: warning

Set this option to `false` until Vite has a proper implementation of import attributes handling.

:::

#### `include` and `exclude`

Type: `string | string[]`  
Default: `**/*.{js,jsx,ts,tsx}`

Specify which files to transform (or not) using globs patterns. By default, all JS and TS files are included.

## Examples

### Basic usage

```ts
import styles from './styles.css' with { type: 'css' };

document.adoptedStyleSheets = [styles];
```

### Web Component usage

```ts
import styles from './my-component.css' with { type: 'css' };

class MyComponent extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets = [styles];
        shadow.innerHTML = `<div>Hello, world!</div>`;
    }
}
```

### Handle fallback for older browsers

```ts
import styles from './styles.css' with { type: 'css' };

if ('adoptedStyleSheets' in Document.prototype) {
    document.adoptedStyleSheets = [styles];
} else {
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
}
```
