import 'vitest/node';

declare module 'vitest/node' {
    export interface _BrowserNames {
        browserstack: `browserstack:${string}`;
    }
}
