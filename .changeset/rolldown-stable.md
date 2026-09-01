---
"@chialab/storybook-dna-vite": patch
"@chialab/vite-plugin-cem": patch
"@chialab/vite-plugin-isolated-decl": patch
---

Widen the optional `rolldown` peer dependency range from the `^1.0.0-rc.0` pre-release to `^1.0.0`, now that rolldown has a stable 1.x release. `@chialab/vite-plugin-cem` and `@chialab/vite-plugin-isolated-decl` also gained a missing `vite` peer dependency declaration (`^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`), matching the `vite` APIs they already use.
