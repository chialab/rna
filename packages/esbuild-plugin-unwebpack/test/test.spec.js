import { fileURLToPath } from 'url';
import unwebpackPlugin from '@chialab/esbuild-plugin-unwebpack';
import esbuild from 'esbuild';
import { describe, expect, test } from 'vitest';

describe('esbuild-plugin-unwebpack', () => {
    test('should replace hmr statements', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                sourcefile: fileURLToPath(import.meta.url),
                contents: `export const test = {};
if (module.hot) {
  module.hot.accept();
}

if (module && module.hot) {
  module.hot.accept();
}

if (module && module.hot && module.hot.decline) {
  module.hot.accept();
}

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}`,
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [unwebpackPlugin()],
        });

        expect(result.text).toBe(`// test.spec.js
var test = {};
export {
  test
};
`);
    });

    test('should resolve magic imports', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.js', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            outdir: 'fixture/output',
            format: 'esm',
            target: 'esnext',
            bundle: true,
            splitting: true,
            write: false,
            plugins: [unwebpackPlugin()],
        });

        expect(result.text).toBe(`// fixture/input.js
var language = "it";
({ "./locale/en": () => import("./en-TJVWBTWR.js"), "./locale/it": () => import("./it-RI2VUW2M.js") })[language]();
`);
    });
});
