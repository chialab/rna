# vitest-axe

Axe violations matchers for Vitest.

## Install

::: code-group

```sh[npm]
npm i -D axe-core @chialab/vitest-axe
```

```sh[yarn]
yarn add -D axe-core @chialab/vitest-axe
```

```sh[pnpm]
pnpm add -D axe-core @chialab/vitest-axe
```

:::

## Usage

Use a Vitest setup file to add the matchers to the test runner expectation API.  
Also, make sure to include typings for the matchers in the `tsconfig.json` file.

::: code-group

```ts[vitest.config.ts]
export default {
    test: {
        setupFiles: ['./test/setup.ts'],
    },
}
```

```ts[test/setup.ts]
import matchers from '@chialab/vitest-axe';
import { expect } from 'vitest';

expect.extend(matchers);
```

```json[tsconfig.json]
{
    "compilerOptions": {
        // ...
        "types": ["@chialab/vitest-axe/matchers"]
    }
}
```

:::

## Example

```ts
import { run as axe } from 'axe-core';
import { describe, expect, test } from 'vitest';

describe('button', () => {
    test('accessibility', async () => {
        const button = document.createElement('button');
        expect(await axe(button)).toHaveNoViolations();
    });
});
```
