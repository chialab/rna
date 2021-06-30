declare module 'postcss-dir-pseudo-class' {
    type Options = { preserve?: boolean };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-nesting' {
    export default () => import('postcss').Plugin;
}

declare module 'postcss-initial' {
    export default () => import('postcss').Plugin;
}

declare module 'postcss-color-hex-alpha' {
    type Options = { preserve?: boolean };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-replace-overflow-wrap' {
    type Options = { method?: 'copy' };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-place' {
    type Options = { preserve?: boolean };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-logical' {
    type Options = { preserve?: boolean };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-pseudo-class-any-link' {
    type Options = { preserve?: boolean };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-font-variant' {
    export default () => import('postcss').Plugin;
}

declare module 'postcss-page-break' {
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

declare module 'postcss-import' {
    type Options = { root?: string };
    export default (options: Options) => import('postcss').Plugin;
}

declare module 'postcss-url' {
    type Options = { url: 'copy', assetsPath: string, useHash?: boolean };
    export default (options: Options) => import('postcss').Plugin;
}
