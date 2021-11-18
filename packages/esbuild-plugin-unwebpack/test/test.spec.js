import esbuild from 'esbuild';
import unwebpackPlugin from '@chialab/esbuild-plugin-unwebpack';
import { expect } from 'chai';

describe('esbuild-plugin-unwebpack', () => {
    it('should replace hmr statements', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                sourcefile: new URL(import.meta.url).pathname,
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
            plugins: [
                unwebpackPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var test = {};
export {
  test
};
`);
    });

    it('should resolve magic imports', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            outdir: 'fixture/output',
            format: 'esm',
            target: 'esnext',
            bundle: true,
            splitting: true,
            write: false,
            plugins: [
                unwebpackPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// fixture/input.js
var language = "it";
({ "./locale/en": () => import("./en-TJVWBTWR.js"), "./locale/it": () => import("./it-RI2VUW2M.js") })[language]();
`);
    });
});
