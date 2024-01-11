/**
 * @param {import('@chialab/rna-browser-test-runner').BrowserLauncher} launcher
 */
export function fixLauncher(launcher) {
    const createDriverManager = /** @type {*} */ (launcher).createDriverManager;
    /**
     * @this {*}
     */
    const create = async function () {
        const result = await createDriverManager.call(this);
        const capabilities = this.driver.capabilities;
        if (
            (capabilities.platform || '').toLowerCase() === 'mac' &&
            capabilities.browserName.toLowerCase() === 'safari' &&
            (capabilities.version.startsWith('9.') || capabilities.version.startsWith('10.'))
        ) {
            const driver = this.driver;
            const navigateTo = driver.navigateTo;
            /**
             * @this {*}
             * @param {string} url
             * @param {*} args
             */
            const navigate = async function (url, ...args) {
                if (url === 'data:,') {
                    return Promise.resolve();
                }
                return navigateTo.call(this, url, ...args);
            };

            Object.defineProperty(driver, 'navigateTo', {
                value: navigate,
                configurable: true,
            });
        }
        return result;
    };
    /** @type {*} */ (launcher).createDriverManager = create;
    return launcher;
}
