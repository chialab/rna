import esbuild from 'esbuild';
import cssImportPlugin from '@chialab/esbuild-plugin-css-import';
import { expect } from 'chai';

describe('esbuild-plugin-css-import', () => {
    it('should resolve css imports', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.css', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            bundle: true,
            write: false,
            plugins: [
                cssImportPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`/* packages/esbuild-plugin-css-import/test/fixture/node_modules/test-lib/lib.css */
html,
body {
  margin: 0;
  padding: 0;
}

/* packages/esbuild-plugin-css-import/test/fixture/input.css */
`);
    });

    it('should ignore external modules', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.css', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            bundle: true,
            write: false,
            external: [
                'test-lib',
            ],
            plugins: [
                cssImportPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`@import "test-lib";

/* packages/esbuild-plugin-css-import/test/fixture/input.css */
`);
    });
});
