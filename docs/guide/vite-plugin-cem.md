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

### Framework analysis

By default the plugin performs a framework-agnostic analysis of your source files. To extract framework-specific metadata (decorators, mixins, inheritance, custom JSDoc tags, …) you need to pass the relevant analyzer plugins through the [`plugins`](#plugins) option.

[`@chialab/cem-analyzer`](./cem-analyzer) ships ready-to-use plugin presets for [DNA](https://chialab.github.io/dna/) and [Lit](https://lit.dev/):

::: code-group

```ts[Lit]
import { litPlugins } from '@chialab/cem-analyzer';
import cemPlugin from '@chialab/vite-plugin-cem';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    cemPlugin({
      plugins: [...litPlugins],
    }),
  ],
});
```

```ts[DNA]
import { dnaPlugins } from '@chialab/cem-analyzer';
import cemPlugin from '@chialab/vite-plugin-cem';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    cemPlugin({
      plugins: [...dnaPlugins],
    }),
  ],
});
```

:::

### Options

#### `include` and `exclude`

Type: `string | RegExp | (string | RegExp)[]`  
Default: `/\.(j|t)sx?$/`

Specify which files to analyze (or not) using glob patterns or regular expressions. By default, all JS and TS files are included.

#### `plugins`

Type: `Plugin[]`  
Default: `[]`

A list of [`@chialab/cem-analyzer`](./cem-analyzer) plugins to run during the analysis. Use this option to enable framework-specific analysis, such as the `dnaPlugins` and `litPlugins` presets. See [Framework analysis](#framework-analysis) for an example.

#### `fileName`

Type: `string`  
Default: `custom-elements.json`

The name of the generated manifest file. The manifest is emitted as a Vite asset, so it will be available in the `dist` folder after the build.

#### `modulePath`

Type: `string | Record<string, string> | ({ fileName: string }) => string`  
Default: `undefined`

Replaces the `path` field of a Custom Elements Manifest module with the provided value. If a string is provided, it will be used for all modules. If an object is provided, the key will be matched against the module path and the value will be used if a match is found. If a function is provided, it will be called with the original module path and should return the new module path.

#### `moduleReadme`

Type: `string | ((manifest: Package) => string | null | void)`  
Default: `undefined`

Sets the `readme` field of the generated manifest. If a string is provided, it will be used as-is. If a function is provided, it will be called with the generated manifest and should return the README content (return a falsy value to leave it unset).

#### `thirdPartyManifests`

Type: `Package[]`  
Default: `[]`

List of third-party packages to use to apply inheritance and mixins in the generated Custom Elements Manifest.
