import type { Options } from 'browserstack-local';

export interface BrowserStackConfig {
    options?: Partial<Options>;
    capabilities?: Record<string, WebdriverIO.Capabilities>;
}

declare module 'vitest/node' {
    interface InlineConfig {
        browserstack?: BrowserStackConfig;
    }
}

declare module 'vite' {
    interface UserConfig {
        /**
         * @deprecated use `test.browserstack` instead.
         */
        browserstack?: BrowserStackConfig;
    }
}
