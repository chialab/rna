import crypto from 'crypto';
import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} selector Scripts selector.
 * @param {string} outDir The output dir.
 * @param {string} target Build target.
 * @param {import('esbuild').Format} format Build format.
 * @return {import('./index').CollectResult|void} Plain build.
 */
function innerCollect($, dom, selector, outDir, target, format) {
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
        finisher(outputFiles) {
            const [jsOutput, ...outputs] = outputFiles;
            elements.forEach((element) => {
                $(element).remove();
            });
            $('body').append(`<script src="${path.relative(outDir, jsOutput.path)}" type="module"></script>`);
            const cssOutputs = outputs.filter((output) => output.path.endsWith('.css'));
            if (cssOutputs) {
                cssOutputs.forEach((cssOutput) => {
                    $('head').append(`<link rel="stylesheet" href="${path.relative(outDir, cssOutput.path)}" />`);
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
            options.outDir,
            options.target[0],
            'iife'
        ),
        innerCollect(
            $,
            dom,
            'script[src][type="module"], script[type="module"]:not([src])',
            options.outDir,
            options.target[1],
            'esm'
        ),
    ].filter(Boolean));
}
