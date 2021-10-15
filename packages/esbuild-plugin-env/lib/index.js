/**
 * Create a map of replacements for environment variables.
 * @return A map of variables.
 */
export function defineEnvVariables() {
    /**
     * @type {{ [key: string]: string }}
     */
    const definitions = {};
    definitions['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');
    Object.keys(process.env).forEach((key) => {
        if (isNaN(parseFloat(key))) {
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
export default function() {

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'env',
        setup(build) {
            const { platform, define = {} } = build.initialOptions;
            if (platform === 'node') {
                return;
            }

            build.initialOptions.define = {
                ...defineEnvVariables(),
                ...define,
            };
        },
    };

    return plugin;
}
