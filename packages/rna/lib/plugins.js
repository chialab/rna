export async function loadLegacyPlugin() {
    const { legacyPlugin } = await import('@web/dev-server-legacy');
    return legacyPlugin({
        polyfills: {
            coreJs: false,
            regeneratorRuntime: true,
            webcomponents: false,
            fetch: false,
            abortController: false,
            intersectionObserver: false,
            resizeObserver: false,
            dynamicImport: true,
            systemjs: true,
            shadyCssCustomStyle: false,
        },
    });
}

export async function loadBabelPlugin() {
    try {
        return (await import('@chialab/esbuild-plugin-swc')).default();
    } catch(err) {
        //
    }

    return (await import('@chialab/esbuild-plugin-babel')).default();
}
