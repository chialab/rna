import crypto from 'crypto';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} selector Scripts selector.
 * @param {string} target Build target.
 * @param {import('esbuild').Format} format Build format.
 * @param {string} type Script type.
 * @return {import('./index').CollectResult|void} Plain build.
 */
function innerCollect($, dom, selector, target, format, type) {
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

    const hash = crypto.createHash('sha1');
    hash.update(contents);

    return {
        build: {
            entryPoint: `index.${hash.digest('hex').substr(0, 8)}.${format}.js`,
            contents,
            outdir: format,
            target,
            format,
        },
        finisher(files) {
            const [jsOutput, ...outputs] = files;
            elements.forEach((element) => {
                $(element).remove();
            });
            $('body').append(`<script src="${jsOutput}" type="${type}"></script>`);
            const cssOutputs = outputs.filter((output) => output.endsWith('.css'));
            if (cssOutputs) {
                cssOutputs.forEach((cssOutput) => {
                    $('head').append(`<link rel="stylesheet" href="${cssOutput}" />`);
                });
            }
        },
    };
}

/**
 * Collect and bundle each <script> reference.
 * @type {import('./index').Collector}
 */
export async function collectScripts($, dom, options) {
    return /** @type {import('./index').CollectResult[]} */ ([
        innerCollect(
            $,
            dom,
            'script[src]:not([type]), script[src][type="text/javascript"], script[src][type="application/javascript"]',
            options.target[0],
            'iife',
            'application/javascript'
        ),
        innerCollect(
            $,
            dom,
            'script[src][type="module"], script[type="module"]:not([src])',
            options.target[1],
            'esm',
            'module'
        ),
    ].filter(Boolean));
}
