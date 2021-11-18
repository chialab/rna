import esbuild from 'esbuild';
import defineThisPlugin from '@chialab/esbuild-plugin-define-this';
import { expect } from 'chai';

describe('esbuild-plugin-define-this', () => {
    it('should resolve to window for browser platform', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: '(function(g) { return g; }(this));',
            },
            platform: 'browser',
            bundle: true,
            write: false,
            plugins: [
                defineThisPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`(() => {
  // test.spec.js
  (function(g) {
    return g;
  })(window);
})();
`);
    });

    it('should resolve to globalThis for neutral platform', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: '(function(g) { return g; }(this));',
            },
            platform: 'neutral',
            bundle: true,
            write: false,
            plugins: [
                defineThisPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
(function(g) {
  return g;
})(globalThis);
`);
    });

    it('should resolve to undefined for node platform', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: '(function(g) { return g; }(this));',
            },
            platform: 'node',
            bundle: true,
            write: false,
            plugins: [
                defineThisPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
(function(g) {
  return g;
})(undefined);
`);
    });
});
