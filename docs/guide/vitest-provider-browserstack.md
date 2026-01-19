# vitest-provider-browserstack

A browser provider for [Vitest](https://vitest.dev/) that runs tests on [Browserstack](https://www.browserstack.com/).

## Install

::: code-group

```sh[npm]
npm i -D @chialab/vitest-provider-browserstack
```

```sh[yarn]
yarn add -D @chialab/vitest-provider-browserstack
```

```sh[pnpm]
pnpm add -D @chialab/vitest-provider-browserstack
```

:::

## Usage

::: info

In order to use this provider, you need to have a Browserstack account and a valid access key.

:::

Use this module as provider for Vitest browser runner:

```ts
import { createBrowserStackProvider } from '@chialab/vitest-provider-browserstack';

const browserstack = createBrowserStackProvider({
    user: 'YOUR_BROWSERSTACK_USERNAME',
    key: 'YOUR_BROWSERSTACK_ACCESS_KEY',
});

export default {
    test: {
        browser: {
            name: 'browserstack:chrome-latest',
            // Use the browserstack provider.
            provider: browserstack(),
            // We need to expose the server to the network in order to let Browserstack access it.
            api: {
                host: '0.0.0.0',
                port: 5176,
            },
            // Hijack ESM imports is unstable on older browsers.
            slowHijackESM: false,
            instances: [
                {
                    browser: 'browserstack:chrome-latest',
                    provider: browserstack({
                        capabilities: {
                            'browserName': 'Chrome',
                            'bstack:options': {
                                browserVersion: 'latest',
                            },
                        },
                    }),
                },
                {
                    browser: 'browserstack:firefox-latest',
                    provider: browserstack({
                        capabilities: {
                            'browserName': 'Firefox',
                            'bstack:options': {
                                browserVersion: 'latest',
                            },
                        },
                    }),
                },
                {
                    browser: 'browserstack:safari-16',
                    provider: browserstack({
                        capabilities: {
                            'browserName': 'Safari',
                            'bstack:options': {
                                browserVersion: '16',
                            },
                        },
                    }),
                },
                {
                    browser: 'browserstack:edge-latest',
                    provider: browserstack({
                        capabilities: {
                            'browserName': 'MicrosoftEdge',
                            'bstack:options': {
                                browserVersion: 'latest',
                            },
                        },
                    }),
                },
            ],
        },
    },
};
```

## Options

`user` and `key` options can be omitted if you have a `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` environment variables set.

Read more about the capabilities configuration at [Browserstack documentation](https://www.browserstack.com/docs/automate/capabilities) and Webdriverio [capabilities](https://webdriver.io/docs/capabilities/).
