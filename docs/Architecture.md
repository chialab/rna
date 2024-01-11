# Architecture

**RNA**'s mission is to provide a toolchain for common frontend (and JavaScript in general) tasks with a strong _conventions over configuration_ and largely opinionated policy.

## ESM first

Since ES modules are support by all modern browsers and Node versions, ESM is the preferred module format. Also, thanks to `URL` and `import.meta.url` support in both environments, we do not need bundle-specific file loaders.

## Close to the metal

Lately, some bundler scopes are very close to framework ones. You can build websites from markdown documents or generate application routing using the filesystem through bundler-spefic code, configurations and conventions. RNA acts with a more lower intent. We would like to optimize tasks, scripts and styles keeping the developer closer as possibile to the platforms. If we exclude JSX and TypeScript support, every project managed by RNA can run natively in both browser and Node environments.

## Incremental toolchain

Not all projects needs to bundle, serve and test using the RNA toolchain. For example, a project that uses Storybook as development environment does not likely need the RNA dev server, as well as a PHP frontend may not need the node test runner. That's why every feature have to be installed along the cli in order to work. This helps us to keep the node modules lighter, providing an easier path for dependencies updates and making faster and more optimized CI builds.
