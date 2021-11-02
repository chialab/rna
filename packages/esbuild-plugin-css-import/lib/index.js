import { styleResolve } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Resolve CSS imports using the node resolution algorithm and the `style` field in package.json.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'css-import',
        setup(build) {
            const { external = [] } = build.initialOptions;
            const { onResolve } = useRna(build);

            onResolve({ filter: /\./ }, async (args) => {
                // Handle @import and @url css statements.
                if (args.kind !== 'import-rule' && args.kind !== 'url-token') {
                    return;
                }

                if (external.some((ext) => args.path.startsWith(ext))) {
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
