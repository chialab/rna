import crypto from 'crypto';
import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} selector Scripts selector.
 * @param {string} outdir The output dir.
 * @param {string} target Build target.
 * @param {import('esbuild').Format} format Build format.
 * @return {import('./index').Build|void} Plain build.
 */
function innerCollect($, dom, selector, outdir, target, format) {
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
        options: {
            entryPoint: `index.${hash.digest('hex').substr(0, 8)}.${format}.js`,
            outdir: format,
            contents,
            target,
            format,
        },
        /**
         * @param {import('esbuild').OutputFile[]} outputFiles
         */
        finisher(outputFiles) {
            const [jsOutput, ...outputs] = outputFiles;
            elements.forEach((element) => {
                $(element).remove();
            });
            $('body').append(`<script src="${path.relative(outdir, jsOutput.path)}" type="module"></script>`);
            const cssOutputs = outputs.filter((output) => output.path.endsWith('.css'));
            if (cssOutputs) {
                cssOutputs.forEach((cssOutput) => {
                    $('head').append(`<link rel="stylesheet" href="${path.relative(outdir, cssOutput.path)}" />`);
                });
            }
        },
    };
}

/**
 * Collect and bundle each <script> reference.
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @param {{ scriptsTarget: string; modulesTarget: string }} targets Scripts target.
 * @return {import('./index').Build[]} A list of builds.
 */
export function collectScripts($, dom, base, outdir, targets = { scriptsTarget: 'es6', modulesTarget: 'es2020' }) {
    return /** @type {import('./index').Build[]} */ ([
        innerCollect(
            $,
            dom,
            'script[src][type="module"], script[type="module"]:not([src])',
            outdir,
            targets.scriptsTarget,
            'esm'
        ),
        innerCollect(
            $,
            dom,
            'script[src]:not([type]), script[src][type="text/javascript"], script[src][type="application/javascript"]',
            outdir,
            targets.scriptsTarget,
            'iife'
        ),
    ].filter(Boolean));
}
