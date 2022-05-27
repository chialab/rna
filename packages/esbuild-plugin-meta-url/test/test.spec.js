import path from 'path';
import esbuild from 'esbuild';
import metaUrl from '@chialab/esbuild-plugin-meta-url';
import virtual from '@chialab/esbuild-plugin-virtual';
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
var file = new URL("./file.txt", import.meta.url);
export {
  file
};
`);
        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
    });

    it('should load a file that was part of another build', async () => {
        const { outputFiles: [result, file] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export * from \'./file1.js\';export * from \'./file2.js\';',
            },
            assetNames: '[name]-[hash]',
            format: 'esm',
            outdir: 'out',
            loader: {
                '.txt': 'file',
            },
            bundle: true,
            write: false,
            plugins: [
                virtual([
                    {
                        path: './file1.js',
                        contents: 'export const file = new URL(\'./file.txt\', import.meta.url);',
                        loader: 'js',
                    },
                    {
                        path: './file2.js',
                        contents: 'export const file2 = new URL(\'./file.txt\', import.meta.url);',
                        loader: 'js',
                    },
                ]),
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`// file1.js
var file = new URL("./file-4e1243bd.txt", import.meta.url);

// file2.js
var file2 = new URL("./file-4e1243bd.txt", import.meta.url);
export {
  file,
  file2
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
var file = new URL("./file.txt", import.meta.url);
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
  var __currentScriptUrl__ = document.currentScript && document.currentScript.src || document.baseURI;
  var file = new URL("./file.txt", __currentScriptUrl__);
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
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// test.spec.js
var test_spec_exports = {};
__export(test_spec_exports, {
  file: () => file
});
module.exports = __toCommonJS(test_spec_exports);
var file = new URL("./file.txt", "file://" + __filename);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  file
});
`);
        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
    });

    it('should resolve a module with warnings', async () => {
        const { warnings, outputFiles: [result, file] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const file = new URL(\'npm_module\', import.meta.url);',
            },
            format: 'esm',
            outdir: 'out',
            loader: {
                '.txt': 'file',
            },
            bundle: true,
            write: false,
            plugins: [
                virtual([{
                    path: 'npm_module',
                    contents: 'test\n',
                    loader: 'js',
                }]),
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var file = new URL("./npm_module", import.meta.url);
export {
  file
};
`);
        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
        expect(warnings).to.be.deep.equal([
            {
                pluginName: 'meta-url',
                text: 'Resolving \'npm_module\' as module is not a standard behavior and may be removed in a future relase of the plugin.',
                detail: '',
                notes: [],
                location: {
                    column: 20,
                    file: 'test.spec.js',
                    length: 38,
                    line: 1,
                    lineText: 'export const file = new URL(\'npm_module\', import.meta.url);',
                    namespace: 'file',
                    suggestion: 'Externalize module import using a JS proxy file.',
                },
            },
        ]);
    });

    it('should not resolve a module with warnings', async () => {
        const { warnings, outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const file = new URL(\'./missing.txt\', import.meta.url);',
            },
            format: 'esm',
            outdir: 'out',
            loader: {
                '.txt': 'file',
            },
            bundle: true,
            write: false,
            plugins: [
                virtual([{
                    path: 'npm_module',
                    contents: 'test\n',
                    loader: 'js',
                }]),
                metaUrl(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var file = new URL("./missing.txt", import.meta.url);
export {
  file
};
`);
        expect(warnings).to.be.deep.equal([
            {
                pluginName: 'meta-url',
                text: 'Unable to resolve \'./missing.txt\' file.',
                detail: '',
                notes: [],
                location: {
                    column: 20,
                    file: 'test.spec.js',
                    length: 41,
                    line: 1,
                    lineText: 'export const file = new URL(\'./missing.txt\', import.meta.url);',
                    namespace: 'file',
                    suggestion: '',
                },
            },
        ]);
    });
});
