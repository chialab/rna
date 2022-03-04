import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

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

    const contents = elements.map((element) => {
        if ($(element).attr('href')) {
            return `@import './${$(element).attr('href')}';`;
        }

        return $(element).html();
    }).join('\n');

    return [{
        build: {
            entryPoint: path.join(options.sourceDir, helpers.createEntry('css')),
            contents,
            loader: 'css',
            target: options.target[0],
        },
        finisher(files) {
            elements.forEach((element) => {
                $(element).remove();
            });

            $('head').append(`<link rel="stylesheet" href="${files[0]}" />`);
        },
    }];
}
