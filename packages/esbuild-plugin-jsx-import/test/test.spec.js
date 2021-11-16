import esbuild from 'esbuild';
import jsxImportPlugin from '@chialab/esbuild-plugin-jsx-import';
import { expect } from 'chai';

describe('esbuild-plugin-jsx-import', () => {
    it('should inject jsx runtime', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const template = <div></div>',
                loader: 'jsx',
            },
            absWorkingDir: new URL('.', import.meta.url).pathname,
            format: 'esm',
            bundle: true,
            write: false,
            jsxFactory: 'h',
            jsxFragment: 'Fragment',
            plugins: [
                jsxImportPlugin({
                    jsxModule: './jsx.named.js',
                }),
            ],
        });

        expect(result.text, `// jsx.named.js
var h = () => {
};
var Fragment = Symbol();

// test.spec.js
var template = /* @__PURE__ */ h("div", null);
export {
  template
};
`);
    });

    it('should inject jsx runtime using default', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const template = <div></div>',
                loader: 'jsx',
            },
            absWorkingDir: new URL('.', import.meta.url).pathname,
            format: 'esm',
            bundle: true,
            write: false,
            jsxFactory: 'h',
            jsxFragment: 'Fragment',
            plugins: [
                jsxImportPlugin({
                    jsxModule: './jsx.default.js',
                    jsxExport: 'default',
                }),
            ],
        });

        expect(result.text, `// jsx.named.js
var h = () => {
};
var Fragment = Symbol();

// test.spec.js
var template = /* @__PURE__ */ h("div", null);
export {
  template
};
`);
    });

    it('should inject jsx runtime using namespace', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const template = <div></div>',
                loader: 'jsx',
            },
            absWorkingDir: new URL('.', import.meta.url).pathname,
            format: 'esm',
            bundle: true,
            write: false,
            jsxFactory: 'JSX.h',
            jsxFragment: 'JSX.Fragment',
            plugins: [
                jsxImportPlugin({
                    jsxModule: './jsx.named.js',
                    jsxExport: 'namespace',
                }),
            ],
        });

        expect(result.text, `// jsx.named.js
var h = () => {
};
var Fragment = Symbol();

// test.spec.js
var template = /* @__PURE__ */ h("div", null);
export {
  template
};
`);
    });
});
