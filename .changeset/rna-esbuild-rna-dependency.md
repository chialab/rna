---
"@chialab/rna": patch
---

Declare `@chialab/esbuild-rna` as a real dependency. The CLI's `build` command imports it at runtime and the package build marks it as `external`, so it was missing from installs that don't happen to hoist it from elsewhere in the workspace.
