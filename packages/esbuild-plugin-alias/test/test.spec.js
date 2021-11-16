import esbuild from 'esbuild';
import aliasPlugin, { createAliasPlugin } from '@chialab/esbuild-plugin-alias';
import { expect } from 'chai';

describe('esbuild-plugin-alias', () => {
    it('should use alias instead of given import', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                sourcefile: new URL(import.meta.url).pathname,
                contents: `import path from 'path';
import { readFile } from 'fs/promises';

export { readFile, path }`,
            },
            format: 'esm',
            platform: 'node',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                aliasPlugin({
                    'fs/promises': './fs.js',
                }),
            ],
        });

        expect(result.text).to.equal(`// ${new URL(import.meta.url).pathname}
import path from "path";

// packages/esbuild-plugin-alias/test/fs.js
var readFile = () => {
};
export {
  path,
  readFile
};
`);
    });

    it('should use empty module instead of given import', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                sourcefile: new URL(import.meta.url).pathname,
                contents: `import path from 'path';
import fs from 'fs/promises';

export { fs, path }`,
            },
            format: 'esm',
            platform: 'node',
            target: 'esnext',
            bundle: true,
            write: false,
            splitting: false,
            plugins: [
                aliasPlugin({
                    'fs/promises': false,
                }),
            ],
        });

        expect(result.text).to.be.equal(`// ${new URL(import.meta.url).pathname}
import path from "path";

// empty:fs/promises
var promises_default = {};
export {
  promises_default as fs,
  path
};
`);
    });

    it('should use alias instead of given import with a new plugin instance', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            stdin: {
                sourcefile: new URL(import.meta.url).pathname,
                contents: `import path from 'path';
import { readFile } from 'fs/promises';

export { readFile, path }`,
            },
            format: 'esm',
            platform: 'node',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                aliasPlugin({
                    'fs/promises': './fs.js',
                }),
                createAliasPlugin()({
                    path: false,
                }),
            ],
        });

        expect(result.text).to.equal(`// empty:path
var path_default = {};

// packages/esbuild-plugin-alias/test/fs.js
var readFile = () => {
};
export {
  path_default as path,
  readFile
};
`);
    });

    it('should read browser alias with browser platform', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            format: 'esm',
            platform: 'browser',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                aliasPlugin(),
            ],
        });

        expect(result.text).to.equal(`// empty:path
var path_default = {};

// packages/esbuild-plugin-alias/test/fs.js
var readFile = () => {
};
export {
  path_default as path,
  readFile
};
`);
    });

    it('should not read browser alias with node platform', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            format: 'esm',
            platform: 'node',
            target: 'esnext',
            bundle: true,
            write: false,
            plugins: [
                aliasPlugin(),
            ],
        });

        expect(result.text).to.equal(`// packages/esbuild-plugin-alias/test/fixture/input.js
import path from "path";
import { readFile } from "fs/promises";
export {
  path,
  readFile
};
`);
    });
});
