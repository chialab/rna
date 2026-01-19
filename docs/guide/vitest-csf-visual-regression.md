# CSF visual regression testing

A Vitest plugin to perform visual regression testing on Storybook stories.

## Overview

Storybook stories written in [Component Story Format (CSF)](https://github.com/ComponentDriven/csf) are often treated as documentation and manual testing artifacts. However, with the advent of [Vitest browser mode](https://vitest.dev/guide/browser/), in-source testing, and [visual regression assertions](https://vitest.dev/guide/browser/visual-regression-testing.html), it becomes possible to transform those stories into fully automated, deterministic visual regression tests—without duplicating logic or rewriting scenarios.

This document describes an approach based on a custom Vite plugin that automatically converts CSF stories into Vitest tests at build time. The solution leverages:

- Vitest browser mode
- Vitest in-source testing
- Storybook’s rendering APIs
- Playwright-backed browser commands
- Screenshot-based visual regression testing

The result is a single source of truth: Storybook stories double as executable tests.

### Goals and Design Principles

The plugin is designed around a few core principles:

- **Zero duplication**: stories remain unchanged and are not rewritten as tests.
- **In-source testing**: tests are injected directly into the story module during Vite’s transform phase.
- **Framework agnosticism**: while the default framework is `@storybook/react`, the plugin is configurable.
- **Deterministic rendering**: time, randomness, geolocation, layout, and animations are controlled to ensure stable snapshots.
- **First-class visual regression**: screenshots are asserted using `expect(...).toMatchScreenshot()` in Vitest browser mode.

### High-Level Architecture

At a high level, the plugin works as follows:

- Intercept CSF story files `(\*.stories.{js,jsx,ts,tsx})`.
- Append Vitest test code using in-source testing.
- Import and render stories using Storybook’s renderStory.
- Control the browser environment (network idle, animations, viewport sizing).
- Capture and compare screenshots using Vitest’s browser expectations.
- All of this happens transparently when running Vitest in browser mode.

### Configuration per Story

Stories can opt into visual regression by defining a `visualRegression` object.

Supported Options

```ts
type CsfVisualRegressionParams = {
    width?: string | number;
    height?: string | number;
    padding?: string | number;

    mock?: {
        date?: Date;
        random?: boolean | number[];
        geolocation?: GeolocationPosition | null;
    };

    beforeRender?: (context) => void | Promise<void>;
    afterRender?: (context) => void | Promise<void>;

    // Plus Vitest screenshot options
};
```

### Deterministic Mocks

Before rendering a story, the test can:

- Freeze time with `vi.setSystemTime`
- Replace `Math.random()` with a deterministic sequence
- Mock browser `geolocation` (or force an error)

All mocks are automatically restored after each test.

### Lifecycle Hooks

Two hooks are available per story:

- `beforeRender`: setup DOM, user interactions, or state
- `afterRender`: final adjustments before snapshot

Each hook receives a rich context:

- `canvasElement`: the story’s rendered container, with applied sizing and padding and `csf-visual-regression-root` class
- `page`, `commands`, `userEvent` from Vitest browser mode

### Advantages of This Approach

- Single Source of Truth
- Stories define rendering, variants, and visual expectations
- No duplication between Storybook and test code.
- New stories → new tests
- Refactors → immediate visual feedback
- Deterministic and CI-Friendly

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vitest-csf-visual-regression
```

```sh[yarn]
yarn add -D @chialab/vitest-csf-visual-regression
```

```sh[pnpm]
pnpm add -D @chialab/vitest-csf-visual-regression
```

:::

## Configuration

You can enable the plugin in your Vitest configuration file, alongside the Vitest browser mode. Please refer to Vitest’s [visual regression testing guide](https://vitest.dev/guide/browser/visual-regression-testing.html) for more information on configuring screenshot assertions and CI integration.

::: code-group

```ts[vite.config.ts]
import csfVisualRegressionPlugin from '@chialab/vitest-csf-visual-regression';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        csfVisualRegressionPlugin({
            framework: '@storybook/react',
            previewFile: './.storybook/preview.js',
        }),
    ],
    test: {
        environment: 'browser',
        browser: {
            provider: playwright(),
            include: ['src/**/*.stories.{ts,tsx}'],
            testTimeout: 30 * 1000,
            headless: true,
            isolate: true,
            viewport: { width: 1280, height: 720 },
            instances: [
                {
                    browser: 'chromium',
                }
            ],
        },
    },
});

```

:::

### Options

#### `framework`

Type: `string`  
Default: `'@storybook/react'`

The Storybook framework to use. Adjust this value according to your project setup (e.g., `@storybook/vue3`, `@storybook/angular`, etc.).

#### `include` and `exclude`

Type: `string | string[]`  
Default: `['**/*.stories.{js,jsx,ts,tsx}']` for `include`, `undefined` for `exclude`

Glob patterns to include or exclude specific story files for visual regression testing. By default, all files matching `**/*.stories.{js,jsx,ts,tsx}` are included.

#### `previewFile`

Type: `string | undefined`  
Default: `undefined`

Path to your Storybook preview file (e.g., `./.storybook/preview.js`). This file is imported to ensure that global decorators, parameters, and configurations are applied during story rendering in tests. If not provided, the default Storybook setup will be used.

#### `networkIdleTimeout`

Type: `number`  
Default: `10_000`

The maximum time (in milliseconds) to wait for network requests to settle before capturing a screenshot. This helps ensure that all resources are loaded and the story is fully rendered.

#### `padding`

Type: `string | number`  
Default: `10px`

Default padding (in pixels or CSS units) to apply around the story’s rendered content when capturing screenshots. This helps avoid clipping issues and ensures consistent visual context.

## Stories parameters

### `width` and `height`

Type: `string | number`  
Default: `undefined` (auto size)

Specify the width and height of the story’s rendering container. Can be defined as a number (pixels) or a string (CSS units, e.g., `50%`, `300px`, `10rem`). If not specified, the container will size to fit the content.

### `padding`

Type: `string | number`  
Default: `undefined`

Specify the padding around the story’s rendered content. Can be defined as a number (pixels) or a string (CSS units). If not specified, the plugin’s default padding will be used.

### `mock.date`

Type: `Date`

Freeze the system time to a specific date during story rendering. Useful for stories that depend on the current date/time.

### `mock.random`

Type: `boolean | number[]`

If set to `true`, replaces `Math.random()` with a deterministic sequence of numbers. If an array of numbers is provided, those values will be used in sequence for each call to `Math.random()`. This ensures consistent randomness across test runs.

### `mock.geolocation`

Type: `GeolocationPosition | null`

Mock the browser’s geolocation API. If a `GeolocationPosition` object is provided, the browser will return that position. If set to `null`, the geolocation request will fail with an error.

### `beforeRender` and `afterRender` hooks

Type: `(context) => void | Promise<void>`

Lifecycle hooks that run before and after the story is rendered. Each hook receives a `context` object containing:

- `canvasElement`: the story’s rendered container element
- `page`: Vitest browser mode’s Playwright page instance
- `commands`: Vitest browser mode’s commands API
- `userEvent`: Vitest browser mode’s user event API
- `vi`: Vitest’s global `vi` object for mocking and spying

These hooks can be used to set up the DOM, perform user interactions, or make final adjustments before capturing the screenshot.

Also, keep in mind that the `play()` function defined in the story is also invoked at render time.

## Examples

### User interactions after rendering

```tsx
export const Primary = {
    render() {
        return (
            <Button
                primary
                label="Primary Button"
            />
        );
    },
    visualRegression: {
        async afterRender({ canvasElement, userEvent }) {
            userEvent.hover(canvasElement.querySelector('button'));
        },
    },
};
```

### Mocking the current date

```tsx
export const CurrentDate = {
    render() {
        return <DateDisplay date={Date.now()} />;
    },
    visualRegression: {
        mock: {
            date: new Date('2024-01-01T12:00:00Z'),
        },
    },
};
```
