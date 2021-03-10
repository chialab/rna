const path = require('path');
const esbuild = require('esbuild');
const browserslist = require('browserslist');
const url = require('./plugins/url');
const postcss = require('./plugins/postcss');

const loaders = {
    '.mjs': 'tsx',
    '.js': 'tsx',
    '.jsx': 'tsx',
    '.ts': 'tsx',
    '.tsx': 'tsx',
    '.json': 'json',
    '.geojson': 'json',
    '.css': 'css',
};

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

async function bundle({
    input,
    output,
    code,
    loader = 'tsx',
    root = process.cwd(),
    format = 'esm',
    platform = format === 'cjs' ? 'node' : 'browser',
    name = camelize(output || input),
    sourceMap = true,
    jsx,
    targets,
    production = false,
    tsconfig,
} = {}) {
    let outputDir = path.extname(output) ? path.dirname(output) : output;
    let target = targets ?
        browserslist(targets)
            .filter((entry) => ['chrome', 'firefox', 'safari', 'edge', 'node'].includes(entry.split(' ')[0]))
            .map((entry) => entry.split(' ').join('')) :
        ['es2020'];

    let entryOptions = {};
    if (code) {
        entryOptions.stdin = {
            contents: code,
            loader,
            resolveDir: root,
            sourcefile: input,
        };
    } else if (input) {
        entryOptions.entryPoints = [input];
    }

    let time = Date.now();
    let result = await esbuild.build({
        ...entryOptions,
        globalName: name,
        outfile: outputDir === output ? undefined : output,
        outdir: outputDir === output ? output : undefined,
        bundle: true,
        target,
        sourcemap: sourceMap,
        minify: !!production,
        platform,
        format,
        metafile: true,
        jsxFactory: jsx && jsx.pragma || undefined,
        jsxFragment: jsx && jsx.pragmaFrag || undefined,
        mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
        loader: loaders,
        tsconfig,
        plugins: [
            postcss(),
            url(loaders),
        ].filter(Boolean),
    });

    console.log(Date.now() - time, result.metafile.outputs);
}

module.exports = {
    bundle,
};
