# @chialab/vite-plugin-cem

## 0.1.4

### Patch Changes

- aacb3f7: Widen the optional `rolldown` peer dependency range from the `^1.0.0-rc.0` pre-release to `^1.0.0`, now that rolldown has a stable 1.x release. `@chialab/vite-plugin-cem` and `@chialab/vite-plugin-isolated-decl` also gained a missing `vite` peer dependency declaration (`^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`), matching the `vite` APIs they already use.

## 0.1.3

### Patch Changes

- c76cbcb: Customize README entries and plugins.
- Updated dependencies [5f39e93]
  - @chialab/cem-analyzer@0.1.6

## 0.1.2

### Patch Changes

- f00d61c: Fix rolldown parsing.

## 0.1.1

### Patch Changes

- 8085726: Use `rolldown` if available with Vite 8.

## 0.1.0

### Minor Changes

- 0721b6a: First release.

### Patch Changes

- Updated dependencies [46f9803]
- Updated dependencies [048082c]
  - @chialab/cem-analyzer@0.1.2
