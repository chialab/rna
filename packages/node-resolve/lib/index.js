import nodeResolve from 'enhanced-resolve';
import isCore from 'is-core-module';

/**
 * @typedef {Object} ResolveOptions
 * @property {string[]} [extensions]
 * @property {string[]} [exportsFields]
 * @property {string[]} [mainFields]
 * @property {string[]} [conditionNames]
 * @property {boolean} [symlinks]
 */

/**
 * A promise based node resolution library based on enhanced-resolve
 * @param {ResolveOptions} [options]
 */
export function createResolver(options = {}) {
    const resolver = nodeResolve.create({
        symlinks: false,
        ...options,
    });

    /**
     * @param {string} spec
     * @param {string} importer
     */
    const resolve = function(spec, importer) {
        return new Promise((resolve, reject) => resolver(
            {},
            importer,
            spec,
            {},
            /**
             * @param {Error} err
             * @param {string} data
             */
            (err, data) => (err ? reject(err) : resolve(data)))
        );
    };

    return resolve;
}

export { isCore };

export const resolve = createResolver();

export const fileResolve = createResolver({
    exportsFields: [],
    mainFields: [],
});

export const styleResolve = createResolver({
    extensions: ['.css'],
    exportsFields: [],
    mainFields: ['style'],
});
