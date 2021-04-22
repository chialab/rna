import { promises } from 'fs';
import swc from '@swc/core';

const { readFile } = promises;
const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

/**
 * @param {import('esbuild').OnLoadArgs & { contents?: string }} args
 * @param {import('@swc/core').Plugin[]} plugins
 * @param {string} contents
 * @return {Promise<import('esbuild').OnLoadResult>}
 */
async function run({ path: filePath }, plugins, contents = '') {
    contents = contents || await readFile(filePath, 'utf-8');

    if (!plugins.length) {
        return {
            contents,
            loader: 'tsx',
        };
    }

    /** @type {import('@swc/core').Program} */
    let program = await swc.parse(contents, {
        syntax: 'typescript',
        tsx: true,
        decorators: true,
        dynamicImport: true,
    });

    program = swc.plugins(plugins)(program);

    let { code } = await swc.print(program, {
        // sourceMaps: 'inline',
    });
    code = code.replace(/(export(?:\s+default)?\s+)(@(?:\s|.)*?)\s*class/g, '$2\n$1class');

    return {
        contents: code,
        loader: 'tsx',
    };
}

/**
 * @param {{ plugins?: import('@swc/core').Plugin[] }} plugins
 * @return An esbuild plugin.
 */
export default function({ plugins = [] } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'swc',
        setup(build, { transform } = { transform: null }) {
            let options = build.initialOptions;
            let { loader = {} } = options;
            let keys = Object.keys(loader);
            let tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loader[key]));
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            if (transform) {
                let { args, contents } = /** @type {{ args: import('esbuild').OnLoadArgs, contents?: string }} */ (/** @type {unknown} */ (transform));
                if (args.path.match(tsxRegex)) {
                    return /** @type {void} */ (/** @type {unknown} */ (run(args, plugins, contents)));
                }

                return /** @type {void} */ (/** @type {unknown} */ (transform));
            }

            build.onLoad({ filter: tsxRegex, namespace: 'file' }, (args) => run(args, plugins));
        },
    };

    return plugin;
}
