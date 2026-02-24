# Storybook for DNA components

This guide provides instructions on how to set up [Storybook](https://storybook.js.org/) for [DNA](https://chialab.github.io/dna/) components in a [Vite](https://vite.dev/) project. Storybook is a powerful tool for developing and testing UI components in isolation, and it can be easily integrated with DNA components to enhance your development workflow.

## Install

::: code-group

```sh[npm]
npm i -D storybook @chialab/storybook-dna-vite
```

```sh[yarn]
yarn add -D storybook @chialab/storybook-dna-vite
```

```sh[pnpm]
pnpm add -D storybook @chialab/storybook-dna-vite
```

:::

## Usage

Please refer to the [Storybook documentation](https://storybook.js.org/docs/get-started/install) for general installation and setup instructions. Once you have it is installed, you can configure Storybook to use the `@chialab/storybook-dna-vite` framework by creating a `.storybook/main.js` file with the following content:

::: code-group

```ts[.storybook/main.js]
export default {
    framework: {
        name: '@chialab/storybook-dna-vite',
        options: {},
    },
    docs: {
        autodocs: 'tag',
    },
};
```

:::
