import { isUrl, styleResolve } from '@chialab/node-resolve';

/**
 * Resolve CSS imports using the node resolution algorithm and the `style` field in package.json.
 * @returns An esbuild plugin.
 */
export default function () {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'css-import',
        setup(build) {
            const { external = [], packages } = build.initialOptions;

            build.onResolve({ filter: /./ }, async (args) => {
                // Handle @import and @url css statements.
                if (args.kind !== 'import-rule' && args.kind !== 'url-token') {
                    return;
                }

                if (packages === 'external') {
                    return;
                }

                if (external.some((ext) => args.path === ext || args.path.startsWith(`${ext}/`))) {
                    return;
                }

                if (isUrl(args.path)) {
                    return;
                }

                try {
                    const result = await styleResolve(args.path, args.importer);
                    if (!result) {
                        return;
                    }

                    return {
                        path: result,
                    };
                } catch (err) {
                    return;
                }
            });
        },
    };

    return plugin;
}
