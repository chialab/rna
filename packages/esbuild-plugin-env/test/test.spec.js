import process from 'process';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import { describe, expect, test } from 'vitest';
import envPlugin from '../lib/index.js';

describe('esbuild-plugin-env', () => {
    test('should inject env values', async () => {
        process.env.CUSTOM_VAR = 'test';
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `export const custom = process.env.CUSTOM_VAR;
export default process.env.NODE_ENV;`,
            },
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [envPlugin()],
        });

        expect(result.text).toBe(`// test.spec.js
var custom = "test";
var test_spec_default = "test";
export {
  custom,
  test_spec_default as default
};
`);
    });

    test('should handle missing values', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `export const custom = process.env.MISSING_VAR;
export default process.env.NODE_ENV;`,
            },
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [envPlugin()],
        });

        expect(result.text).toBe(`// <define:process.env>
var define_process_env_default = {};

// test.spec.js
var custom = define_process_env_default.MISSING_VAR;
var test_spec_default = "test";
export {
  custom,
  test_spec_default as default
};
`);
    });

    test('should handle invalid identifiers', async () => {
        process.env['INVALID-IDENTIFIER'] = true;
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export default process.env.NODE_ENV;',
            },
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [envPlugin()],
        });

        expect(result.text).toBe(`// test.spec.js
var test_spec_default = "test";
export {
  test_spec_default as default
};
`);
    });

    test('should skip injection for node plaform', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export default process.env.NODE_ENV;',
            },
            format: 'esm',
            platform: 'node',
            bundle: true,
            write: false,
            plugins: [envPlugin()],
        });

        expect(result.text).toBe(`// test.spec.js
var test_spec_default = process.env.NODE_ENV;
export {
  test_spec_default as default
};
`);
    });
});
