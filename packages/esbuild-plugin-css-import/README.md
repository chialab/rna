<p align="center">
    <strong>Esbuild Plugin CSS Import</strong> • Resolve CSS imports using the node resolution algorithm and the `style` field in package.json.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/esbuild-plugin-css-import"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/esbuild-plugin-css-import.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/esbuild-plugin-css-import -D
```

```sh
yarn add @chialab/esbuild-plugin-css-import -D
```

## Usage

This plugin enables the node resolution algorithm for CSS files. That means that `@import` and `@url()` statements can refer to both relative files and NPM packages. CSS modules must have the `style` field in their pakcage.json in order to correctly pickup the CSS entrypoint.

```js
import cssImportPlugin from '@chialab/esbuild-plugin-css-import';
import esbuild from 'esbuild';

await esbuild.build({
    plugins: [cssImportPlugin()],
});
```

### Example

**node_modules/css-framework/package.json**

```json
{
    "name": "css-framework",
    "style": "index.css"
}
```

**node_modules/css-framework/index.css**

```css
:root {
    --accent-color: #000;
}
```

**src/main.css**

```css
@import 'css-framework';

body {
    color: var(--accent-color);
}
```

---

## License

**Esbuild Plugin CSS Import** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/esbuild-plugin-css-import/LICENSE) license.
