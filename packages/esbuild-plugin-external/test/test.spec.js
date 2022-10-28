import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import externalPlugin from '@chialab/esbuild-plugin-external';
import { expect } from 'chai';

describe('esbuild-plugin-external', () => {
    it('should externalize remote modules', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `import { render } from 'https://unpkg.com/@chialab/dna';
                export { render }`,
            },
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                externalPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
import { render } from "https://unpkg.com/@chialab/dna";
export {
  render
};
`);
    });

    it('should externalize dependencies', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.js', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                externalPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// fixture/input.js
export * from "dep";

// fixture/node_modules/peerdep/index.js
var peer = "peer";

// fixture/node_modules/optionaldep/index.js
var optional = "optional";

// fixture/node_modules/devdep/index.js
var dev = "dev";
export {
  dev,
  optional,
  peer
};
`);
    });

    it('should externalize all dependencies', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.js', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                externalPlugin({ dependencies: true, peerDependencies: true, optionalDependencies: true }),
            ],
        });

        expect(result.text).to.be.equal(`// fixture/input.js
export * from "dep";
export * from "peerdep";
export * from "optionaldep";

// fixture/node_modules/devdep/index.js
var dev = "dev";
export {
  dev
};
`);
    });

    it('should externalize given deps', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.js', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                externalPlugin({ dependencies: ['dep'], peerDependencies: ['peerdep'], optionalDependencies: ['optionaldep'] }),
            ],
        });

        expect(result.text).to.be.equal(`// fixture/input.js
export * from "dep";
export * from "peerdep";
export * from "optionaldep";

// fixture/node_modules/devdep/index.js
var dev = "dev";
export {
  dev
};
`);
    });

    it('should skip without bundle', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.js', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            format: 'esm',
            bundle: false,
            write: false,
            plugins: [
                externalPlugin({ dependencies: true, peerDependencies: true, optionalDependencies: true }),
            ],
        });

        expect(result.text).to.be.equal(`export * from "dep";
export * from "peerdep";
export * from "optionaldep";
export * from "devdep";
`);
    });
});
