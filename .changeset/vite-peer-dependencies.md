---
"@chialab/vite-plugin-commonjs": patch
"@chialab/vite-plugin-css-modules": patch
"@chialab/vite-plugin-hmr-dna": patch
"@chialab/vite-plugin-worker-proxy": patch
"@chialab/vitest-csf-visual-regression": patch
---

Declare the missing `vite` peer dependency (`^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`), matching the `vite` APIs and types these plugins already use. `@chialab/vitest-csf-visual-regression` also gained a `vitest` (`^4.0.0`) peer dependency for the same reason.
