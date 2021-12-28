import path from 'path';
import esbuild from 'esbuild';
import metaUrl from '@chialab/esbuild-plugin-meta-url';
import { expect } from 'chai';

describe('esbuild-plugin-meta-url', () => {
    it('should load a file', async () => {
        const { outputFiles: [result, file] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const file = new URL(\'./file.txt\', import.meta.url);',
            },
            format: 'esm',
            outdir: 'out',
            loader: {
                '.txt': 'file',
            },
            bundle: true,
            write: false,
            plugins: [
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var file = new URL("./file.txt?emit=file", import.meta.url);
export {
  file
};
`);
        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
    });

    it('should search for non literal references', async () => {
        const { outputFiles: [result, file] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: `const fileName = './file.txt';
export const file = new URL(fileName, import.meta.url);`,
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var file = new URL("./file.txt?emit=file", import.meta.url);
export {
  file
};
`);

        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
    });

    it('should skip unknown references', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const file = new URL(globalThis.test, import.meta.url);',
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var file = new URL(globalThis.test, import.meta.url);
export {
  file
};
`);
    });

    it('should use browser base url for iife', async () => {
        const { outputFiles: [result, file] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const file = new URL(\'./file.txt\', import.meta.url);',
            },
            platform: 'browser',
            format: 'iife',
            outdir: 'out',
            loader: {
                '.txt': 'file',
            },
            bundle: true,
            write: false,
            plugins: [
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`(() => {
  // test.spec.js
  var file = new URL("./file.txt?emit=file", document.currentScript && document.currentScript.src || document.baseURI);
})();
`);
        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
    });

    it('should use node legacy file path', async () => {
        const { outputFiles: [result, file] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const file = new URL(\'./file.txt\', import.meta.url);',
            },
            platform: 'node',
            format: 'cjs',
            outdir: 'out',
            loader: {
                '.txt': 'file',
            },
            bundle: true,
            write: false,
            plugins: [
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// test.spec.js
__export(exports, {
  file: () => file
});
var file = new URL("./file.txt?emit=file", "file://" + __filename);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  file
});
`);
        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
    });
});
