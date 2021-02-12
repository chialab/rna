const path = require('path');
const esbuild = require('esbuild');
const browserslist = require('browserslist');
const loaders = require('./loaders');
const source = require('./plugins/source');
const url = require('./plugins/url');
const postcss = require('./plugins/postcss');

/**
 * Convert a file path to CamelCase.
 *
 * @param {string} file The file path.
 * @return {string}
 */
function camelize(file) {
    let filename = path.basename(file, path.extname(file));
    return filename.replace(/(^[a-z0-9]|[-_]([a-z0-9]))/g, (g) => (g[1] || g[0]).toUpperCase());
}

let service = null;
async function startService() {
    service = await esbuild.startService();
}

async function stopService() {
    service = null;
}

async function bundle({
    input,
    output,
    code,
    root = process.cwd(),
    format = 'esm',
    platform = format === 'cjs' ? 'node' : 'browser',
    name = camelize(output || input),
    sourceMap = true,
    jsx,
    targets,
    transform = false,
    production = false,
} = {}) {
    let outputDir = path.extname(output) ? path.dirname(output) : output;
    let entryPoint = path.resolve(root, input);
    let target = targets ?
        browserslist(targets)
            .filter((entry) => ['chrome', 'firefox', 'safari', 'edge', 'node'].includes(entry.split(' ')[0]))
            .map((entry) => entry.split(' ').join('')) :
        ['es2020'];

    await (service || esbuild).build({
        globalName: name,
        entryPoints: [entryPoint],
        outfile: outputDir === output ? undefined : output,
        outdir: outputDir === output ? output : undefined,
        bundle: true,
        target,
        sourcemap: sourceMap,
        minify: !!production,
        platform,
        format,
        jsxFactory: jsx && jsx.pragma || undefined,
        jsxFragment: jsx && jsx.pragmaFrag || undefined,
        mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
        loader: loaders,
        plugins: [
            code && !entryPoint.endsWith('.css') && source(entryPoint, code),
            postcss(entryPoint, code, root, targets, transform),
            url(loaders),
        ].filter(Boolean),
    });
}

module.exports = {
    startService,
    stopService,
    bundle,
};
