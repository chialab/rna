import path from 'path';
import crypto from 'crypto';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} selector Scripts selector.
 * @param {string} sourceDir Build sourceDir.
 * @param {string} target Build target.
 * @param {import('esbuild').Format} format Build format.
 * @param {string} type Script type.
 * @param {{ [key: string]: string }} [attrs] Script attrs.
 * @return {import('./index').CollectResult|void} Plain build.
 */
function innerCollectBundle($, dom, selector, sourceDir, target, format, type, attrs = {}) {
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
            entryPoint: path.join(sourceDir, `index.${hash.digest('hex').substr(0, 8)}.${format}.js`),
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
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} selector Scripts selector.
 * @param {string} sourceDir Build sourceDir.
 * @param {string} target Build target.
 * @param {import('esbuild').Format} format Build format.
 * @param {string} type Script type.
 * @param {{ [key: string]: string }} [attrs] Script attrs.
 * @return {import('./index').CollectResult[]} Plain build.
 */
function innerCollect($, dom, selector, sourceDir, target, format, type, attrs = {}) {
    const elements = dom.find(selector)
        .get()
        .filter((element) => !$(element).attr('src') || isRelativeUrl($(element).attr('src')));

    if (!elements.length) {
        return [];
    }

    return elements.map((element) =>
        ({
            build: {
                entryPoint: /** @type {string} */ ($(element).attr('src')),
                outdir: format,
                target,
                format,
            },
            finisher(files) {
                const [jsOutput, ...outputs] = files;
                const script = $(`<script src="${jsOutput}" type="${type}"></script>`);
                for (const attrName in attrs) {
                    script.attr(attrName, attrs[attrName]);
                }
                $(element).replaceWith(script);;

                if (attrs.nomodule !== '') {
                    const cssOutputs = outputs.filter((output) => output.endsWith('.css'));
                    if (cssOutputs) {
                        cssOutputs.forEach((cssOutput) => {
                            $('head').append(`<link rel="stylesheet" href="${cssOutput}" />`);
                        });
                    }
                }
            },
        })
    );
}

/**
 * Collect and bundle each <script> reference.
 * @type {import('./index').Collector}
 */
export async function collectScripts($, dom, options) {
    return /** @type {import('./index').CollectResult[]} */ ([
        ...innerCollect(
            $,
            dom,
            'script[src]:not([type]):not([nomodule]), script[src][type="text/javascript"]:not([nomodule]), script[src][type="application/javascript"]:not([nomodule])',
            options.sourceDir,
            options.target[0],
            'iife',
            'application/javascript'
        ),
        innerCollectBundle(
            $,
            dom,
            'script[src]:not([type])[nomodule], script[src][type="text/javascript"][nomodule], script[src][type="application/javascript"][nomodule]',
            options.sourceDir,
            options.target[0],
            'iife',
            'application/javascript',
            { nomodule: '' }
        ),
        innerCollectBundle(
            $,
            dom,
            'script[src][type="module"], script[type="module"]:not([src])',
            options.sourceDir,
            options.target[1],
            'esm',
            'module'
        ),
    ].filter(Boolean));
}
