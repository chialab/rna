/**
 * Create a map of replacements for environment variables.
 * @return A map of variables.
 */
export function defineEnvVariables() {
    /**
     * @type {{ [key: string]: string }}
     */
    let definitions = {};
    definitions['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');
    Object.keys(process.env).forEach((map, key) => {
        if (isNaN(key)) {
            definitions[`process.env.${key}`] = JSON.stringify(process.env[key]);
        }
    });
    definitions['process.env'] = '{}';

    return definitions;
}


/**
 * Pass environment variables to esbuild.
 * @return An esbuild plugin.
 */
export function envPlugin() {

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'env',
        setup(build) {
            let options = build.initialOptions;
            options.define = {
                ...defineEnvVariables(),
                ...(options.define || {}),
            };
        },
    };

    return plugin;
}
