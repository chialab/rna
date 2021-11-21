import path from 'path';
import crypto from 'crypto';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * Collect and bundle each <link> reference.
 * @type {import('./index').Collector}
 */
export async function collectStyles($, dom, options) {
    const elements = dom
        .find('link[href][rel="stylesheet"], style')
        .get()
        .filter((element) => !$(element).attr('href') || isRelativeUrl($(element).attr('href')));

    if (!elements.length) {
        return [];
    }

    const contents = elements.map((element) => {
        if ($(element).attr('href')) {
            return `@import './${$(element).attr('href')}';`;
        }

        return $(element).html();
    }).join('\n');

    const hash = crypto.createHash('sha1');
    hash.update(contents);

    return [{
        build: {
            entryPoint: `index.${hash.digest('hex').substr(0, 8)}.css`,
            contents,
            loader: 'css',
            outdir: 'css',
            target: options.target[0],
        },
        finisher(outputFiles) {
            elements.forEach((element) => {
                $(element).remove();
            });
            $('head').append(`<link rel="stylesheet" href="${path.relative(options.outDir, outputFiles[0].path)}" />`);
        },
    }];
}
