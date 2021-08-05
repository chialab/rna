import { TARGETS, parseSourcemap } from '@chialab/estransform';

/**
 * Transpile entry to standard js.
 * @param {import('esbuild').TransformOptions} [config]
 * @param {typeof import('esbuild')} [esbuild]
 * @return {import('@chialab/estransform').TransformCallack}
 */
export function createTypeScriptTransform(config = {}, esbuild) {
    return async function transpileTypescript({ code }, options) {
        esbuild = esbuild || await import('esbuild');
        const { code: finalCode, map } = await esbuild.transform(code, {
            tsconfigRaw: {},
            sourcemap: true,
            format: 'esm',
            target: TARGETS.es2020,
            sourcefile: options.source,
            loader: config.loader,
            jsxFactory: config.jsxFactory,
            jsxFragment: config.jsxFragment,
        });

        return {
            code: finalCode,
            map: parseSourcemap(map),
            target: TARGETS.es2020,
            loader: 'js',
        };
    };
}
