import esbuild from 'esbuild';
import externalPlugin from '@chialab/esbuild-plugin-external';
import { expect } from 'chai';

describe('esbuild-plugin-external', () => {
    it('should externalize remote modules', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
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

        expect(result.text).to.be.equal(`// packages/esbuild-plugin-external/test/test.spec.js
import { render } from "https://unpkg.com/@chialab/dna";
export {
  render
};
`);
    });

    it('should externalize dependencies', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                externalPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// packages/esbuild-plugin-external/test/fixture/input.js
export * from "dep";

// packages/esbuild-plugin-external/test/fixture/node_modules/peerdep/index.js
var peer = "peer";

// packages/esbuild-plugin-external/test/fixture/node_modules/optionaldep/index.js
var optional = "optional";

// packages/esbuild-plugin-external/test/fixture/node_modules/devdep/index.js
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
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                externalPlugin({ dependencies: true, peerDependencies: true, optionalDependencies: true }),
            ],
        });

        expect(result.text).to.be.equal(`// packages/esbuild-plugin-external/test/fixture/input.js
export * from "dep";
export * from "peerdep";
export * from "optionaldep";

// packages/esbuild-plugin-external/test/fixture/node_modules/devdep/index.js
var dev = "dev";
export {
  dev
};
`);
    });

    it('should externalize given deps', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                externalPlugin({ dependencies: ['dep'], peerDependencies: ['peerdep'], optionalDependencies: ['optionaldep'] }),
            ],
        });

        expect(result.text).to.be.equal(`// packages/esbuild-plugin-external/test/fixture/input.js
export * from "dep";
export * from "peerdep";
export * from "optionaldep";

// packages/esbuild-plugin-external/test/fixture/node_modules/devdep/index.js
var dev = "dev";
export {
  dev
};
`);
    });

    it('should skip without bundle', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
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
