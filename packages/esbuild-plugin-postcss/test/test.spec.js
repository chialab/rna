import { fileURLToPath } from 'url';
import cssImportPlugin from '@chialab/esbuild-plugin-css-import';
import esbuild from 'esbuild';
import { describe, expect, test } from 'vitest';
import postcssPlugin from '../lib/index.js';

describe('esbuild-plugin-postcss', () => {
    test('should run postcss default transformations', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                sourcefile: fileURLToPath(new URL('input.css', import.meta.url)),
                contents: `::placeholder {
  color: gray;
}`,
                loader: 'css',
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [postcssPlugin()],
        });

        expect(result.text).toBe(`/* input.css */
::-webkit-input-placeholder {
  color: gray;
}
::-moz-placeholder {
  color: gray;
}
:-ms-input-placeholder {
  color: gray;
}
::-ms-input-placeholder {
  color: gray;
}
::placeholder {
  color: gray;
}
`);
    });

    test('should convert sass', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                sourcefile: fileURLToPath(new URL('input.scss', import.meta.url)),
                contents: `.parent {
  .child {
    color: red;
  }
}`,
                loader: 'css',
            },
            loader: {
                '.scss': 'css',
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [postcssPlugin()],
        });

        expect(result.text).toBe(`/* input.scss */
.parent .child {
  color: red;
}
`);
    });

    test('should include sass modules', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.scss', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            loader: {
                '.scss': 'css',
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [cssImportPlugin(), postcssPlugin()],
        });

        expect(result.text).toBe(`/* fixture/input.scss */
body,
html {
  margin: 0;
  padding: 0;
}
.wrapper {
  width: 768px;
}
`);
    });

    test('should load postcss config', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.css', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            sourcemap: false,
            plugins: [postcssPlugin()],
        });

        expect(result.text).toBe('body{margin:0}');
    });
});
