import process from 'node:process';
import { webdriverio } from '@vitest/browser/providers';
import { Local } from 'browserstack-local';
import ip from 'ip';
import { remote } from 'webdriverio';

/**
 * @typedef {import('./vite').BrowserStackConfig} BrowserStackConfig
 */

/**
 * @typedef {import('browserstack-local').Options} Options
 * @typedef {import('vitest/node').BrowserProvider} BrowserProvider
 * @typedef {import('vitest/node').BrowserProviderInitializationOptions} BrowserProviderInitializationOptions
 * @typedef {import('vitest/node').WorkspaceProject} WorkspaceProject
 * @typedef {import('webdriverio').RemoteOptions} RemoteOptions
 */

/**
 * A BrowserStack provider for vitest.
 * @implements {BrowserProvider}
 */
export default class BrowserStackProvider extends webdriverio {
    /**
     * @type {string}
     */
    name = 'browserstack';

    /**
     * @type {string}
     * @protected
     */
    testName;

    /**
     * @type {Local}
     * @protected
     */
    bs;

    /**
     * @type {Partial<Options>}
     * @protected
     */
    bsOptions;

    /**
     * @type {RemoteOptions['capabilities'] & { 'bstack:options'?: object }}
     * @protected
     */
    capabilities;

    /**
     * @type {Promise<WebdriverIO.Browser> | null}
     * @private
     */
    _browserPromise = null;

    /**
     * @type {Promise<() => Promise<void>> | null}
     * @private
     */
    _tunnelPromise = null;

    /**
     * @inheritdoc
     */
    supportsParallelism = false;

    /**
     * Get supported browsers.
     * @returns {string[]}
     */
    getSupportedBrowsers = () =>
        Object.assign([], {
            includes: /** @param {string} value */ (value) => value.startsWith('browserstack:'),
        });

    /**
     * Initialize the BrowserStack provider.
     * @param {WorkspaceProject} ctx The workspace project.
     * @param {BrowserProviderInitializationOptions} options The initialization options.
     * @throws {Error} If browser configuration is missing.
     */
    initialize(ctx, options) {
        super.initialize(ctx, options);

        const { config, browser } = ctx;
        if (!browser) {
            throw new Error('BrowserStack provider requires a browser configuration');
        }

        this.testName = config.name;

        const { browser: browserName } = options;
        const browserstackConfig =
            ('config' in browser
                ? /** @type {import('vite').UserConfig} */ (browser.config).browserstack
                : browser.vite.config.browserstack) || {};
        if (!browserstackConfig.capabilities) {
            throw new Error('Missing capabilities in browserstack configuration');
        }

        this.bsOptions = {
            force: true,
            forceLocal: true,
            user: /** @type {string} */ (process.env.BROWSERSTACK_USERNAME),
            key: /** @type {string} */ (process.env.BROWSERSTACK_ACCESS_KEY),
            localIdentifier: `vitest-${Date.now()}`,
            ...(browserstackConfig.options || {}),
        };
        this.capabilities = browserstackConfig.capabilities[browserName.replace('browserstack:', '')];
        if (!this.capabilities) {
            throw new Error(`Missing capabilities for browser name ${browserName}`);
        }
        this.bs = new Local();
    }

    /**
     * Start the tunnel.
     * @returns {Promise<() => Promise<void>>}
     */
    async startTunnel() {
        if (this._tunnelPromise) {
            return this._tunnelPromise;
        }

        return (this._tunnelPromise = new Promise((resolve, reject) => {
            this.bs.start(this.bsOptions, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(
                        () =>
                            new Promise((resolve) => {
                                this.bs.stop(() => resolve());
                            })
                    );
                }
            });
        }));
    }

    /**
     * Open the browser.
     * @returns {Promise<WebdriverIO.Browser>}
     */
    async openBrowser() {
        if (this._browserPromise) {
            return this._browserPromise;
        }

        return (this._browserPromise = Promise.resolve().then(async () => {
            await this.startTunnel();
            const capabilities = {
                ...this.capabilities,
                'bstack:options': {
                    ...this.capabilities['bstack:options'],
                    local: true,
                    buildName: this.testName,
                    localIdentifier: this.bsOptions.localIdentifier,
                },
            };

            const browser = await remote({
                logLevel: 'error',
                capabilities,
                user: /** @type {string} */ (this.bsOptions.user),
                key: /** @type {string} */ (this.bsOptions.key),
            });

            this.browser = browser;

            return browser;
        }));
    }

    /**
     * Open the page in the browser.
     * @param {string} contextId - The browser context.
     * @param {string} url - The URL to open.
     * @returns {Promise<void>}
     */
    openPage = async (contextId, url) => {
        const browser = await this.openBrowser();
        const networkAddress = ip.address();
        if (networkAddress) {
            url = url.replace(/(localhost|127\.0\.0\.1|0\.0\.0\.0)/, networkAddress);
        }

        await browser.navigateTo(url);

        const title = await browser.getTitle();
        if (title !== 'Vitest Browser Runner') {
            throw new Error('Failed to open url');
        }
    };

    /**
     * Close the browser and tunnel.
     * @returns {Promise<void>}
     */
    close = async () => {
        try {
            if (this._tunnelPromise) {
                const closeTunnel = await this._tunnelPromise;
                await closeTunnel();
            }
        } catch {
            //
        }

        return super.close();
    };
}
