declare module 'polyfill-library' {
    export type Config = {
        uaString?: string;
        minify?: boolean;
        features: { [key: string]: unknown };
    };

    function getPolyfillString(options: Config): Promise<string>;

    export type { getPolyfillString };
}
