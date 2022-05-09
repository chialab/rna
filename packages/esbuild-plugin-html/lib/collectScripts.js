import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} selector Scripts selector.
 * @param {string} sourceDir Build sourceDir.
 * @param {string} target Build target.
 * @param {import('esbuild').Format} format Build format.
 * @param {string} type Script type.
 * @param {{ [key: string]: string }} attrs Script attrs.
 * @param {import('./index.js').Helpers} helpers Helpers.
 * @returns {import('./index').CollectResult|void} Plain build.
 */
function innerCollect($, dom, selector, sourceDir, target, format, type, attrs = {}, helpers) {
    const elements = dom.find(selector)
        .get()
        .filter((element) => !$(element).attr('src') || isRelativeUrl($(element).attr('src')));

    if (!elements.length) {
        return;
    }

    const contents = elements.map((element) => {
        if ($(element).attr('src')) {
            return `import './${$(element).attr('src')}';`;
        }

        return $(element).html();
    }).join('\n');

    return {
        build: {
            entryPoint: path.join(sourceDir, helpers.createEntry('js')),
            contents,
            target,
            format,
        },
        finisher(files) {
            const [jsOutput, ...outputs] = files;
            elements.forEach((element) => {
                $(element).remove();
            });
            const script = $(`<script src="${jsOutput}" type="${type}"></script>`);
            for (const attrName in attrs) {
                script.attr(attrName, attrs[attrName]);
            }
            $('body').append(script);

            if (attrs.nomodule !== '') {
                const cssOutputs = outputs.filter((output) => output.endsWith('.css'));
                if (cssOutputs) {
                    cssOutputs.forEach((cssOutput) => {
                        $('head').append(`<link rel="stylesheet" href="${cssOutput}" />`);
                    });
                }
            }
        },
    };
}

/**
 * Collect and bundle each <script> reference.
 * @type {import('./index').Collector}
 */
export async function collectScripts($, dom, options, helpers) {
    return /** @type {import('./index').CollectResult[]} */ ([
        innerCollect(
            $,
            dom,
            'script[src]:not([type]):not([nomodule]), script[src][type="text/javascript"]:not([nomodule]), script[src][type="application/javascript"]:not([nomodule])',
            options.sourceDir,
            options.target[0],
            'iife',
            'application/javascript',
            {},
            helpers
        ),
        innerCollect(
            $,
            dom,
            'script[src]:not([type])[nomodule], script[src][type="text/javascript"][nomodule], script[src][type="application/javascript"][nomodule]',
            options.sourceDir,
            options.target[0],
            'iife',
            'application/javascript',
            { nomodule: '' },
            helpers
        ),
        innerCollect(
            $,
            dom,
            'script[src][type="module"], script[type="module"]:not([src])',
            options.sourceDir,
            options.target[1],
            'esm',
            'module',
            {},
            helpers
        ),
    ].filter(Boolean));
}
