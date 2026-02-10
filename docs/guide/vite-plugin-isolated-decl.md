# vite-plugin-isolated-decl

A Vite plugin to generate isolated declaration files for TypeScript sources.

It uses the TypeScript compiler API to generate declaration files for each source file, without bundling them together. Output declaration files are emitted in the output directory, with the same structure as the source files.

::: info

Isolated declarations must be enabled in the TypeScript configuration (`tsconfig.json`) by setting the `compilerOptions.isolatedDeclarations` option to `true`.

:::

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vite-plugin-isolated-decl
```

```sh[yarn]
yarn add -D @chialab/vite-plugin-isolated-decl
```

```sh[pnpm]
pnpm add -D @chialab/vite-plugin-isolated-decl
```

:::

## Configuration

Add the plugin to your Vite config:

::: code-group

```ts[vite.config.ts]
import isolatedDeclPlugin from '@chialab/vite-plugin-isolated-decl';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    isolatedDeclPlugin(),
  ],
});
```

```ts[tsconfig.json]
{
  "compilerOptions": {
    "isolatedDeclarations": true,
  }
}
```

:::

## Other plugins

**[unplugin-isolated-decl](https://github.com/unplugin/unplugin-isolated-decl)**

✅ As any other "unplugin", it works with multiple bundlers and supports multiple declaration generators.

❌ It requires `entryFileNames` option to be a pattern string, which does not work well with Vite's lib mode `fileName` option.

**[rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts)**

✅ Uses native Rolldown support to transpile and bundle declaration files, which is faster than using the TypeScript compiler API.

❌ Bundling declarations files sometimes fails with edge cases.
