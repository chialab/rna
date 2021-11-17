import esbuild from 'esbuild';
import postcssPlugin from '@chialab/esbuild-plugin-postcss';
import { expect } from 'chai';

describe('esbuild-plugin-postcss', () => {
    it('should run postcss default transformations', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                sourcefile: new URL('input.css', import.meta.url).pathname,
                contents: `::placeholder {
  color: gray;
}`,
                loader: 'css',
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                postcssPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`/* packages/esbuild-plugin-postcss/test/input.css */
::-webkit-input-placeholder {
  color: gray;
}
:-ms-input-placeholder {
  color: gray;
}
::placeholder {
  color: gray;
}
`);
    });

    it('should convert sass', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                sourcefile: new URL('input.scss', import.meta.url).pathname,
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
            plugins: [
                postcssPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`/* packages/esbuild-plugin-postcss/test/input.scss */
.parent .child {
  color: red;
}
`);
    });

    it('should include sass modules', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.scss', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            loader: {
                '.scss': 'css',
            },
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                postcssPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`/* packages/esbuild-plugin-postcss/test/fixture/input.scss */
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

    it('should load postcss config', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.css', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            format: 'esm',
            target: 'esnext',
            bundle: true,
            write: false,
            sourcemap: false,
            plugins: [
                postcssPlugin(),
            ],
        });

        expect(result.text).to.be.equal('body{margin:0}');
    });
});
