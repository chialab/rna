import esbuild from 'esbuild';
import envPlugin from '@chialab/esbuild-plugin-env';
import { expect } from 'chai';

describe('esbuild-plugin-env', () => {
    it('should inject env values', async () => {
        process.env.CUSTOM_VAR = 'test';
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: `export const custom = process.env.CUSTOM_VAR;
export default process.env.NODE_ENV;`,
            },
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                envPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var custom = "test";
var test_spec_default = "development";
export {
  custom,
  test_spec_default as default
};
`);
    });

    it('should handle missing values', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: `export const custom = process.env.MISSING_VAR;
export default process.env.NODE_ENV;`,
            },
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                envPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// <define:process.env>
var define_process_env_default = {};

// test.spec.js
var custom = define_process_env_default.MISSING_VAR;
var test_spec_default = "development";
export {
  custom,
  test_spec_default as default
};
`);
    });

    it('should handle invalid identifiers', async () => {
        process.env['INVALID-IDENTIFIER'] = true;
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export default process.env.NODE_ENV;',
            },
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                envPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var test_spec_default = "development";
export {
  test_spec_default as default
};
`);
    });

    it('should skip injection for node plaform', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export default process.env.NODE_ENV;',
            },
            format: 'esm',
            platform: 'node',
            bundle: true,
            write: false,
            plugins: [
                envPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var test_spec_default = process.env.NODE_ENV;
export {
  test_spec_default as default
};
`);
    });
});
