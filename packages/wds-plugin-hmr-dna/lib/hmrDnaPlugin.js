import { parse } from '@chialab/estransform';
import { getRequestFilePath } from '@chialab/es-dev-server';
import { patch } from './patch.js';

/**
 * Create a server plugin that injects hmr.js module.
 * @returns A server plugin.
 */
export function hmrDnaPlugin() {
    /**
     * @type {string}
     */
    let rootDir;

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'dna-hmr',

        serverStart(args) {
            rootDir = args.config.rootDir;
        },

        resolveImport(args) {
            if (args.source === '/__web-dev-server__/hmr-dna.js') {
                return args.source;
            }
        },

        serve(context) {
            if (context.path === '/__web-dev-server__/hmr-dna.js') {
                return patch;
            }
        },

        async transform(context) {
            if (!context.response.is('js')) {
                return;
            }

            const body = /** @type {string} */ (context.body);
            const matches = body.match(/import\s*\{([^}]*)\}\s*from\s*['|"]@chialab\/dna['|"]/g);
            if (!matches) {
                return;
            }

            const specs = matches
                .map((importMatch) => {
                    const match = importMatch.match(/import\s*\{([^}]*)\}\s*from\s*['|"]@chialab\/dna['|"]/);
                    if (match) {
                        return match[1];
                    }
                    return [];
                })
                .flat()
                .map((match) => match.split(','))
                .flat()
                .map((match) => match.trim());

            if (!specs.includes('customElement') && !specs.includes('customElements')) {
                return;
            }

            const filePath = getRequestFilePath(context.url, rootDir);
            const { helpers } = await parse(body, filePath);
            helpers.append(`import '/__web-dev-server__/hmr-dna.js';
if (import.meta.hot) {
    import.meta.hot.accept();
}`);
            const { code } = helpers.generate({
                sourcemap: true,
            });

            context.body = code;
        },
    };

    return plugin;
}
