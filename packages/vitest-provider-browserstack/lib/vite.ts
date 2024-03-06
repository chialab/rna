import type { Options } from 'browserstack-local';
import type { RemoteOptions } from 'webdriverio';

export interface BrowserStackConfig {
    options?: Partial<Options>;
    capabilities?: Record<string, RemoteOptions['capabilities']>;
}

declare module 'vite' {
    interface UserConfig {
        browserstack?: BrowserStackConfig;
    }
}
