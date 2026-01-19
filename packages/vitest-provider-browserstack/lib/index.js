import process from 'node:process';
import { defineBrowserProvider } from '@vitest/browser';
import { WebdriverBrowserProvider } from '@vitest/browser-webdriverio';
import { Local } from 'browserstack-local';
import ip from 'ip';
import { remote } from 'webdriverio';

/**
 * @typedef {import('./types')} Types
 */

/**
 * A BrowserStack provider for vitest.
 */
export default class BrowserStackProvider extends WebdriverBrowserProvider {
    /**
     * @type {string}
     * @protected
     */
    testName;

    /**
     * @type {Partial<import('browserstack-local').Options>}
     * @protected
     */
    _bsOptions;

    /**
     * @type {WebdriverIO.Capabilities & { 'bstack:options'?: object }}
     * @protected
     */
    _capabilities;

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
     * @param {import('vitest/node').TestProject} project The test project.
     * @param {import('@vitest/browser-webdriverio').WebdriverProviderOptions} options Webdriverio options.
     * @param {Partial<import('browserstack-local').Options>} bsOptions BrowserStack local options.
     * @param {Promise<() => Promise<void>>} tunnelPromise Promise that resolves to a function to close the tunnel.
     */
    constructor(project, options, bsOptions, tunnelPromise) {
        super(project, options);

        const { config } = project;
        this.testName = config.name;
        this._bsOptions = bsOptions;
        this._tunnelPromise = tunnelPromise;
        this._capabilities = /** @type {WebdriverIO.Capabilities & { 'bstack:options'?: object }} */ (
            options.capabilities
        );
    }

    /**
     * Open the browser.
     * @returns {Promise<WebdriverIO.Browser>}
     */
    async openBrowser() {
        if (this._browserPromise) {
            return this._browserPromise;
        }

        this._browserPromise = Promise.resolve().then(async () => {
            await this._tunnelPromise;
            const capabilities = {
                ...this._capabilities,
                'bstack:options': {
                    ...this._capabilities['bstack:options'],
                    local: true,
                    buildName: this.testName,
                    localIdentifier: this._bsOptions.localIdentifier,
                },
            };

            const browser = await remote({
                logLevel: 'error',
                capabilities,
                user: /** @type {string} */ (this._bsOptions.user),
                key: /** @type {string} */ (this._bsOptions.key),
            });

            this.browser = browser;

            return browser;
        });

        return this._browserPromise;
    }

    /**
     * Open the page in the browser.
     * @param {string} _contextId - The browser context.
     * @param {string} url - The URL to open.
     * @returns {Promise<void>}
     */
    openPage = async (_contextId, url) => {
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

/**
 * Create the BrowserStack provider.
 * @param {Partial<import('browserstack-local').Options>} [options] - The provider options.
 * @return {(options?: import('@vitest/browser-webdriverio').WebdriverProviderOptions) => import('vitest/node').BrowserProviderOption<import('@vitest/browser-webdriverio').WebdriverProviderOptions>}
 */
export const createBrowserStackProvider = (options = {}) => {
    const bsOptions = {
        force: true,
        forceLocal: true,
        user: /** @type {string} */ (process.env.BROWSERSTACK_USERNAME),
        key: /** @type {string} */ (process.env.BROWSERSTACK_ACCESS_KEY),
        localIdentifier: `vitest-${Date.now()}`,
        ...options,
    };
    const bs = new Local();
    const tunnelPromise = new Promise((resolve, reject) => {
        bs.start(bsOptions, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve(
                    () =>
                        /**
                         * @type {Promise<void>}
                         */
                        (
                            new Promise((resolve) => {
                                bs.stop(() => resolve());
                            })
                        )
                );
            }
        });
    });

    return (options) =>
        defineBrowserProvider({
            name: 'browserstack',
            options,
            providerFactory: (project) => new BrowserStackProvider(project, options || {}, bsOptions, tunnelPromise),
        });
};
