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
