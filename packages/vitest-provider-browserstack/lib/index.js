/**
 * @import { BrowserProviderOption, TestProject } from 'vitest/node';
 * @import { WebdriverProviderOptions } from '@vitest/browser-webdriverio';
 * @import { Options } from 'browserstack-local';
 * @import { Capabilities } from '@wdio/types';
 */
import process from 'node:process';
import { defineBrowserProvider } from '@vitest/browser';
import { WebdriverBrowserProvider } from '@vitest/browser-webdriverio';
import { Local } from 'browserstack-local';
import ip from 'ip';
import { remote } from 'webdriverio';

/**
 * @typedef {Capabilities & { 'bstack:options'?: Capabilities.BrowserStackCapabilities }} BrowserStackCapabilities
 */

/**
 * @typedef {{ buildName?: string; projectName?: string }} BrowserStackProviderData
 */

/**
 * A BrowserStack provider for vitest.
 */
export default class BrowserStackProvider extends WebdriverBrowserProvider {
    /**
     * @type {string | null | undefined}
     * @protected
     */
    _buildName;

    /**
     * @type {string | null | undefined}
     * @protected
     */
    _projectName;

    /**
     * @type {TestProject}
     * @protected
     */
    _project;

    /**
     * @type {Partial<Options>}
     * @protected
     */
    _bsOptions;

    /**
     * @type {BrowserStackCapabilities}
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
     * @type {(closeSelf: () => Promise<void>) => Promise<void>}
     * @private
     */
    _takeTurn;

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
     * @param {TestProject} project The test project.
     * @param {WebdriverProviderOptions} options Webdriverio options.
     * @param {BrowserStackProviderData} data The provider data.
     * @param {Partial<Options>} bsOptions BrowserStack local options.
     * @param {Promise<() => Promise<void>>} tunnelPromise Promise that resolves to a function to close the tunnel.
     * @param {(closeSelf: () => Promise<void>) => Promise<void>} takeTurn Waits for, and closes, the previously active session (shared across all providers of the same `createBrowserStackProvider` call).
     */
    constructor(project, options, data, bsOptions, tunnelPromise, takeTurn) {
        super(project, options);

        const { config } = project;
        this._buildName = data.buildName || config.name?.replace(/\s*\([^)]+\)$/, '');
        this._projectName = data.projectName;
        this._project = project;
        this._bsOptions = bsOptions;
        this._tunnelPromise = tunnelPromise;
        this._capabilities = /** @type {BrowserStackCapabilities} */ (options.capabilities);
        this._takeTurn = takeTurn;
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
            // since `supportsParallelism` is false, projects run one after another: by the
            // time this project's session is about to open, the previous (sequential) project
            // has already fully finished, so its session can be safely closed now to free the
            // BrowserStack concurrency slot before opening this one.
            await this._takeTurn(this._closeSession);

            /**
             * @type {BrowserStackCapabilities}
             */
            const capabilities = {
                ...this._capabilities,
                'bstack:options': {
                    // avoid the session being killed by BrowserStack while long test files
                    // run without sending any webdriver command; can be overridden below
                    idleTimeout: 300,
                    buildName: this._buildName ?? undefined,
                    projectName: this._projectName ?? undefined,
                    video: false,
                    ...this._capabilities?.['bstack:options'],
                    local: true,
                    localIdentifier: this._bsOptions.localIdentifier,
                },
            };

            this.browser = await remote({
                logLevel: 'error',
                capabilities,
                user: /** @type {string} */ (this._bsOptions.user),
                key: /** @type {string} */ (this._bsOptions.key),
            });

            return this.browser;
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

        await browser.navigateTo(
            networkAddress ? url.replace(/(localhost|127\.0\.0\.1|0\.0\.0\.0)/, networkAddress) : url
        );

        const title = await browser.getTitle();
        if (title !== 'Vitest Browser Runner') {
            throw new Error('Failed to open url');
        }
    };

    /**
     * Report the project test outcome as the BrowserStack session status.
     * @returns {Promise<void>}
     */
    reportSessionStatus = async () => {
        if (!this.browser) {
            return;
        }

        const testModules = this._project.vitest.state
            .getTestModules()
            .filter((testModule) => testModule.project === this._project);
        const failedModules = testModules.filter((testModule) => !testModule.ok());
        const status = failedModules.length ? 'failed' : 'passed';
        const reason = failedModules.length
            ? `${failedModules.length} of ${testModules.length} test file(s) failed`
            : 'All tests passed';

        await this.browser.execute(
            `browserstack_executor: ${JSON.stringify({
                action: 'setSessionStatus',
                arguments: { status, reason },
            })}`
        );
    };

    /**
     * Report the session status and close it (without touching the shared tunnel), so the
     * BrowserStack concurrency slot can be handed off to the next project.
     * @private
     * @returns {Promise<void>}
     */
    _closeSession = async () => {
        if (!this.browser) {
            return;
        }

        await this.reportSessionStatus().catch(() => undefined);
        await super.close().catch(() => undefined);
        this.browser = null;
        this._browserPromise = null;
    };

    /**
     * Close the browser and tunnel.
     * @returns {Promise<void>}
     */
    close = async () => {
        await this._closeSession();

        try {
            if (this._tunnelPromise) {
                const closeTunnel = await this._tunnelPromise;
                await closeTunnel();
            }
        } catch {
            //
        }
    };
}

/**
 * Create the BrowserStack provider.
 * @param {BrowserStackProviderData} [data] - The provider data.
 * @param {Partial<Options>} [options] - The provider options.
 * @return {(options?: WebdriverProviderOptions) => BrowserProviderOption<WebdriverProviderOptions>}
 */
export const createBrowserStackProvider = (data = {}, options = {}) => {
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

    // Sessions are handed off one at a time across every provider created from this call, so
    // that at most one BrowserStack session is open at any given time (see `openBrowser`).
    /** @type {(() => Promise<void>) | null} */
    let activeSessionClose = null;
    let handoffQueue = Promise.resolve();

    /** @type {(closeSelf: () => Promise<void>) => Promise<void>} */
    const takeTurn = (closeSelf) => {
        handoffQueue = handoffQueue.then(async () => {
            if (activeSessionClose) {
                await activeSessionClose().catch(() => undefined);
            }
            activeSessionClose = closeSelf;
        });
        return handoffQueue;
    };

    return (options) =>
        defineBrowserProvider({
            name: 'browserstack',
            options,
            providerFactory: (project) =>
                new BrowserStackProvider(project, options || {}, data || {}, bsOptions, tunnelPromise, takeTurn),
        });
};
