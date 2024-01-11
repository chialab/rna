import process from 'process';

/**
 * @param {string} str
 */
function isValidId(str) {
    try {
        new Function(`var ${str};`);
    } catch (err) {
        return false;
    }
    return true;
}

/**
 * Create a map of replacements for environment variables.
 * @returns A map of variables.
 */
export function defineEnvVariables() {
    /**
     * @type {{ [key: string]: string }}
     */
    const definitions = {};
    definitions['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');
    Object.keys(process.env).forEach((key) => {
        if (isValidId(key)) {
            definitions[`process.env.${key}`] = JSON.stringify(process.env[key]);
        }
    });
    definitions['process.env'] = '{}';

    return definitions;
}

/**
 * Pass environment variables to esbuild.
 * @returns An esbuild plugin.
 */
export default function () {
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
