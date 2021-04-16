declare module 'postcss-all-unset' {
    export default () => import('postcss').Plugin;
}

declare module 'postcss-custom-properties' {
    type Options = { preserve?: boolean };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-focus-visible' {
    export default () => import('postcss').Plugin;
}

declare module 'postcss-focus-within' {
    type Options = { replaceWith?: string };
    export default (options: Options) => import('postcss').Plugin;
}
