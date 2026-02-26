# vite-plugin-cem

Generate a [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) for [Vite](https://vite.dev/) builds.

It generates a manifest by analyzing the source code of your project, extracting information about custom elements, their properties, methods, events, and slot, and outputs a bundled JSON file.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vite-plugin-cem
```

```sh[yarn]
yarn add -D @chialab/vite-plugin-cem
```

```sh[pnpm]
pnpm add -D @chialab/vite-plugin-cem
```

:::

## Configuration

Add the plugin to your Vite config:

::: code-group

```ts[vite.config.ts]
import cemPlugin from '@chialab/vite-plugin-cem';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    cemPlugin(),
  ],
});
```

:::

### Options

#### `include` and `exclude`

Type: `string | string[]`  
Default: `**/*.{js,jsx,ts,tsx}`

Specify which files to transform (or not) using globs patterns. By default, all JS and TS files are included.

#### `fileName`

The name of the generated manifest file. By default, it is `custom-elements.json`. Manifest is emitted as Vite asset, so it will be available in the `dist` folder after the build.

#### `modulePath`

Type: `string | Record<string, string> | ({ fileName: string }) => string`  
Default: `undefined`

Replaces the `path` field of a Custom Elements Manifest module with the provided value. If a string is provided, it will be used for all modules. If an object is provided, the key will be matched against the module path and the value will be used if a match is found. If a function is provided, it will be called with the original module path and should return the new module path.

#### `thirdPartyManifests`

Type: `Package[]`  
Default: `[]`

List of third-party packages to use to apply inheritance and mixins in the generated Custom Elements Manifest.
