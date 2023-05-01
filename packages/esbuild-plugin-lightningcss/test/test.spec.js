import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import lightningcssPlugin from '@chialab/esbuild-plugin-lightningcss';
import { expect } from 'chai';

describe('esbuild-plugin-lightningcss', () => {
    it('should run lightningcss default transformations', async () => {
        const { outputFiles: [result] } = await esbuild.build({
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
            plugins: [
                lightningcssPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`/* input.css */
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
