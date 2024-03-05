import { fileURLToPath } from 'url';
import lightningcssPlugin from '@chialab/esbuild-plugin-lightningcss';
import esbuild from 'esbuild';
import { describe, expect, test } from 'vitest';

describe('esbuild-plugin-lightningcss', () => {
    test('should run lightningcss default transformations', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(new URL('input.css', import.meta.url)),
                contents: `::placeholder {
  color: gray;
}`,
                loader: 'css',
            },
            format: 'esm',
            target: ['safari10', 'firefox18', 'edge18'],
            bundle: true,
            write: false,
            plugins: [lightningcssPlugin()],
        });

        expect(result.text).toBe(`/* input.css */
::-webkit-input-placeholder {
  color: gray;
}
::-moz-placeholder {
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
});
