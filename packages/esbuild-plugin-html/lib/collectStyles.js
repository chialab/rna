import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';
import { Build } from '@chialab/esbuild-rna';

/**
 * Collect and bundle each <link> reference.
 * @type {import('./index').Collector}
 */
export async function collectStyles($, dom, options, helpers) {
    const elements = dom
        .find('link[href][rel="stylesheet"], style')
        .get()
        .filter((element) => !$(element).attr('href') || isRelativeUrl($(element).attr('href')));

    if (!elements.length) {
        return [];
    }

    /**
     * @type {Map<import('cheerio').Element, import('@chialab/esbuild-rna').VirtualEntry|string>}
     */
    const builds = new Map();

    /**
     * @type {Map<string, import('cheerio').Element>}
     */
    const entrypoints = new Map();

    await Promise.all(elements.map(async (element) => {
        const href = $(element).attr('href');
        if (href) {
            const resolvedFile = await helpers.resolve(href);
            if (!resolvedFile.path) {
                return;
            }

            builds.set(element, resolvedFile.pluginData === Build.RESOLVED_AS_FILE ? resolvedFile.path : href);
            entrypoints.set(resolvedFile.path, element);
        } else {
            const entryPoint = path.join(options.sourceDir, helpers.createEntry('css'));
            builds.set(element, {
                path: entryPoint,
                contents: $(element).html() || '',
                loader: 'css',
            });
            entrypoints.set(entryPoint, element);
        }
    }));

    const result = await helpers.emitBuild({
        entryPoints: [...builds.values()],
        target: options.target[0],
    });

    Object.entries(result.metafile.outputs).forEach(([outName, output]) => {
        if (outName.endsWith('.map')) {
            // ignore map files
            return;
        }
        if (!output.entryPoint) {
            // ignore chunks
            return;
        }

        const entryPoint = path.join(options.workingDir, output.entryPoint);
        const element = entrypoints.get(entryPoint);
        if (!element) {
            // unknown entrypoint
            return;
        }

        const fullOutName = path.join(options.workingDir, outName);
        const outputPath = helpers.resolveRelativePath(fullOutName, options.entryDir, '');
        if ($(element).is('link')) {
            $(element).attr('href', outputPath);
        } else {
            $(element).html(`@import '${outputPath}'`);
        }
    });

    return [result];
}
