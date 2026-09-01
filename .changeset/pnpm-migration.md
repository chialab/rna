---
"@chialab/cem-analyzer": patch
"@chialab/cjs-to-esm": patch
"@chialab/es-dev-server": patch
"@chialab/esbuild-plugin-any-file": patch
"@chialab/esbuild-plugin-babel": patch
"@chialab/esbuild-plugin-commonjs": patch
"@chialab/esbuild-plugin-css-import": patch
"@chialab/esbuild-plugin-env": patch
"@chialab/esbuild-plugin-html": patch
"@chialab/esbuild-plugin-lightningcss": patch
"@chialab/esbuild-plugin-meta-url": patch
"@chialab/esbuild-plugin-metadata": patch
"@chialab/esbuild-plugin-postcss": patch
"@chialab/esbuild-plugin-require-resolve": patch
"@chialab/esbuild-plugin-unwebpack": patch
"@chialab/esbuild-plugin-virtual": patch
"@chialab/esbuild-plugin-worker": patch
"@chialab/esbuild-rna": patch
"@chialab/estransform": patch
"@chialab/hmr-dna": patch
"@chialab/node-resolve": patch
"@chialab/postcss-dart-sass": patch
"@chialab/postcss-preset-chialab": patch
"@chialab/postcss-url-rebase": patch
"@chialab/rna": patch
"@chialab/rna-bundler": patch
"@chialab/rna-config-loader": patch
"@chialab/rna-dev-server": patch
"@chialab/rna-logger": patch
"@chialab/storybook-dna": patch
"@chialab/vite-plugin-commonjs": patch
"@chialab/vite-plugin-css-modules": patch
"@chialab/vite-plugin-hmr-dna": patch
"@chialab/vite-plugin-worker-proxy": patch
"@chialab/vitest-axe": patch
"@chialab/vitest-csf-visual-regression": patch
"@chialab/vitest-provider-browserstack": patch
"@chialab/wds-plugin-hmr": patch
"@chialab/wds-plugin-legacy": patch
"@chialab/wds-plugin-node-resolve": patch
"@chialab/wds-plugin-polyfill": patch
"@chialab/wds-plugin-rna": patch
---

Update dev dependencies and declare dependencies that were previously resolved only through Yarn's flat `node_modules` hoisting (esbuild, vite, koa/chokidar/@web/dev-server-core types, @types/node, and a few others), so each package's dependency graph is correct under pnpm's strict per-package isolation. No runtime behavior changes.
