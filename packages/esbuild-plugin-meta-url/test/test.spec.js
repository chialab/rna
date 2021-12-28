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
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);

// test.spec.js
var test_spec_exports = {};
__export(test_spec_exports, {
  file: () => file
});
var file = new URL("./file.txt?emit=file", "file://" + __filename);
module.exports = __toCommonJS(test_spec_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  file
});
`);
        expect(file.text).to.be.equal('test\n');
        expect(path.dirname(result.path)).to.be.equal(path.dirname(file.path));
    });
});
