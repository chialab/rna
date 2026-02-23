# Custom Elements Manifest Analyzer

A tool to statically analyze a project and generate a [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) file, which is a JSON file that describes the custom elements defined in the project, their properties, methods, events, and other metadata.

This tool is largely inspired by—and in many parts directly based on—the [`@custom-elements-manifest/analyzer`](https://github.com/open-wc/custom-elements-manifest/tree/master/packages/analyzer) package by [open-wc](https://open-wc.org/), with several significant architectural changes:

* This tool is designed to be used as a JavaScript module rather than a CLI, allowing for greater flexibility when integrating with other tools and build processes. It also minimizes external dependencies, making it lighter and faster to run.
* While the original package relies on TypeScript for file analysis, this tool can work with any Abstract Syntax Tree (AST) compatible with [estree](https://github.com/estree/estree) or its [TypeScript variant](https://typescript-eslint.io/packages/typescript-estree/). This allows users to choose the parser that best fits their project, such as [oxc-parser](https://oxc.rs/docs/guide/usage/parser.html), [Rollup](https://rollupjs.org/), or others.
* Since it does not perform full type checking, it can analyze the types of properties, methods, and events only when using [Isolated Declarations](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#isolated-declarations).
* Mixin support is not currently planned.

## Install

::: code-group

```sh[npm]
npm i -D @chialab/cem-analyzer
```

```sh[yarn]
yarn add -D @chialab/cem-analyzer
```

```sh[pnpm]
pnpm add -D @chialab/cem-analyzer
```

:::

## Usage

Use the `generate` function to analyze source files and generate a Custom Elements Manifest:

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { generate } from '@chialab/cem-analyzer';
import { parse } from 'oxc-parser';

const sourceFiles = await Promise.all([
    'src/components/my-element.ts',
    // other source files...
].map(async (file) => ({
    fileName: file,
    ...(await parse(await readFile(file, 'utf-8'))),
})));

const customElementsManifest = await generate(sourceFiles);

await writeFile(
    'custom-elements.json',
    JSON.stringify(customElementsManifest, null, 2)
);
```

Alternatively, you can use the `bundle` function to generate a bundled Custom Elements Manifest that includes all the source files in a single JSON file:

```ts
import { bundle } from '@chialab/cem-analyzer';

const sourceFiles = ...; // same as above

const customElementsManifest = await bundle({
    '@acme/components': sourceFiles,
});
await writeFile(
    'custom-elements.json',
    JSON.stringify(customElementsManifest, null, 2)
);
```
