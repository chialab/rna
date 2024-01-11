declare module 'polyfill-library' {
    export type Config = {
        uaString?: string;
        minify?: boolean;
        features: { [key: string]: any };
    };

    function getPolyfillString(options: Config): Promise<string>;

    export { getPolyfillString };
}
