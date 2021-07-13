import path from 'path';
import { getRequestFilePath } from '@web/dev-server-core';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, JS_EXTENSIONS, JSON_EXTENSIONS, CSS_EXTENSIONS } from '@chialab/rna-bundler';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @implements {Plugin}
 */
export class EsbuildPlugin {
    name = 'esbuild';

    /**
     * @param {Partial<import('@chialab/rna-bundler').TransformConfig>} transformConfig
     */
    constructor(transformConfig = {}) {
        this.transformConfig = transformConfig;
    }

    /**
     * @param {{ config: import('@web/dev-server-core').DevServerCoreConfig }} param0
     */
    async serverStart({ config }) {
        this.config = config;
    }

    /**
     * @param {import('@web/dev-server-core').Context} context
     */
    resolveMimeType(context) {
        const fileExtension = path.posix.extname(context.path);
        if (JS_EXTENSIONS.includes(fileExtension) ||
            JSON_EXTENSIONS.includes(fileExtension)) {
            return 'js';
        }
        if (CSS_EXTENSIONS.includes(fileExtension)) {
            return 'css';
        }
    }

    /**
     * @param {import('@web/dev-server-core').Context} context
     */
    async transform(context) {
        if (!this.config) {
            return;
        }

        const fileExtension = path.posix.extname(context.path);
        const loader = transformLoaders[fileExtension];
        if (!loader) {
            return;
        }

        const filePath = getRequestFilePath(context.url, this.config.rootDir);
        const { code } = await transform({
            input: filePath,
            ...this.transformConfig,
            sourcemap: 'inline',
            sourcesContent: true,
            root: this.config.rootDir,
            code: /** @type {string} */ (context.body),
            target: 'es2020',
            loader,
            plugins: [
                ...(await loadPlugins({ postcss: {} })),
                ...(this.transformConfig.plugins || []),
            ],
            transformPlugins: [
                ...(await loadTransformPlugins()),
                (await import('@chialab/esbuild-plugin-node-resolve')).default({
                    extensions: JS_EXTENSIONS,
                    conditionNames: ['default', 'module', 'import', 'browser'],
                    mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'browser', 'main'],
                }),
                ...(this.transformConfig.transformPlugins || []),
            ],
        });

        return code;
    }
}

/**
 * @param {Partial<import('@chialab/rna-bundler').TransformConfig>} [config]
 */
export function esbuildPlugin(config) {
    return new EsbuildPlugin(config);
}
