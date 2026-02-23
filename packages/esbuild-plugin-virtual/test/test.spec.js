import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { describe, expect, test } from 'vitest';
import virtualPlugin, { createVirtualPlugin } from '../lib/index.js';

describe('esbuild-plugin-virtual', () => {
    test('should load virtual modules', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            stdin: {
                sourcefile: fileURLToPath(import.meta.url),
                contents: `import { test } from 'virtualMod';
export { test }`,
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                virtualPlugin([
                    {
                        path: 'virtualMod',
                        contents: 'export const test = () => {};',
                        loader: 'js',
                    },
                ]),
            ],
        });

        expect(result.text).toBe(`// virtualMod
var test = () => {
};
export {
  test
};
`);
    });

    test('should load virtual modules with a new plugin instance', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            stdin: {
                sourcefile: fileURLToPath(import.meta.url),
                contents: `import { test } from 'virtualMod';
export { test }`,
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                createVirtualPlugin()([
                    {
                        path: 'virtualMod',
                        contents: 'export const test = () => {};',
                        loader: 'js',
                    },
                ]),
            ],
        });

        expect(result.text).toBe(`// virtualMod
var test = () => {
};
export {
  test
};
`);
    });

    test('should load css virtual modules', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            stdin: {
                sourcefile: fileURLToPath(import.meta.url),
                contents: "@import 'virtualMod';",
                loader: 'css',
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                virtualPlugin([
                    {
                        path: 'virtualMod',
                        contents: 'body { color: red; }',
                        loader: 'css',
                    },
                ]),
            ],
        });

        expect(result.text).toBe(`/* virtualMod */
body {
  color: red;
}

/* packages/esbuild-plugin-virtual/test/test.spec.js */
`);
    });
});
