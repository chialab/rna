<p align="center">
    <strong>Browserstack provider for Vitest</strong> • A BrowserStack provider for Vitest browser runner.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/vitest-provider-browserstack"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/vitest-provider-browserstack.svg?style=flat-square"></a>
</p>

---

## Install

```sh
npm i @chialab/vitest-provider-browserstack -D
```

```sh
yarn add @chialab/vitest-provider-browserstack -D
```

## Usage

In order to use this provider, you need to have a Browserstack account and a valid access key.

Use this module as provider for Vitest browser runner:

```ts
/// <reference types="@chialab/vitest-provider-browserstack" />

export default {
    test: {
        browser: {
            name: 'browserstack:chrome-latest',
            // Use the browserstack provider.
            provider: '@chialab/vitest-provider-browserstack',
            // We need to expose the server to the network in order to let Browserstack access it.
            api: {
                host: '0.0.0.0',
                port: 5176,
            },
            // Hijack ESM imports is unstable on older browsers.
            slowHijackESM: false,
        },
    },
    browserstack: {
        options: {
            user: 'YOUR_BROWSERSTACK_USERNAME',
            key: 'YOUR_BROWSERSTACK_ACCESS_KEY',
        },
        capabilities: {
            'chrome-latest': {
                'browserName': 'Chrome',
                'bstack:options': {
                    browserVersion: 'latest',
                },
            },
            'firefox-latest': {
                'browserName': 'Firefox',
                'bstack:options': {
                    browserVersion: 'latest',
                },
            },
            'safari-latest': {
                'browserName': 'Safari',
                'bstack:options': {
                    browserVersion: 'latest',
                },
            },
            'edge-latest': {
                'browserName': 'MicrosoftEdge',
                'bstack:options': {
                    browserVersion: 'latest',
                },
            },
        },
    },
};
```

## Options

`user` and `key` options can be omitted if you have a `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` environment variables set.

Read more about the capabilities configuration at [Browserstack documentation](https://www.browserstack.com/docs/automate/capabilities) and Webdriverio [capabilities](https://webdriver.io/docs/capabilities/).

---

## License

**vitest-provider-browserstack** is released under the [MIT](https://github.com/chialab/rna/blob/main/packages/vitest-provider-browserstack/LICENSE) license.
