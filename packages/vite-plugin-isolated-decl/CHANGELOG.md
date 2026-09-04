# @chialab/vite-plugin-isolated-decl

## 0.1.7

### Patch Changes

- aacb3f7: Widen the optional `rolldown` peer dependency range from the `^1.0.0-rc.0` pre-release to `^1.0.0`, now that rolldown has a stable 1.x release. `@chialab/vite-plugin-cem` and `@chialab/vite-plugin-isolated-decl` also gained a missing `vite` peer dependency declaration (`^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`), matching the `vite` APIs they already use.

## 0.1.6

### Patch Changes

- d9474f9: Generate declarations for modules imported only as types.

## 0.1.5

### Patch Changes

- 69a8331: Allow declarations filtering.

## 0.1.4

### Patch Changes

- 80c4dd9: Extend typescript constraint.

## 0.1.3

### Patch Changes

- 8085726: Use `rolldown` if available with Vite 8.

## 0.1.2

### Patch Changes

- d3037b1: Add `exports` field to package.json

## 0.1.1

### Patch Changes

- 0433f7f: Fix common source directory when module is just one file.

## 0.1.0

### Minor Changes

- 16bba0b: First release.
