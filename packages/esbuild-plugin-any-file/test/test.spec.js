import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { describe, expect, test } from 'vitest';
import anyFilePlugin from '../lib/index.js';

describe('esbuild-plugin-any-file', () => {
    test('should load a file with unknown loader', async () => {
        const {
            outputFiles: [file, result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `export * from './fs.js';
import file from './unknown';
export default file;`,
            },
            bundle: true,
            write: false,
            plugins: [anyFilePlugin()],
        });

        expect(file.text.trim()).toBe('unknown content');
        expect(result.text).toBe(`(() => {
  // fs.js
  var readFile = () => {
  };

  // unknown
  var unknown_default = "./unknown-ROMZJ4GL";

  // test.spec.js
  var test_spec_default = unknown_default;
})();
`);
    });

    test('should throw if file does not exits', async () => {
        let err;
        try {
            await esbuild.build({
                absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
                stdin: {
                    resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                    sourcefile: fileURLToPath(import.meta.url),
                    contents: `import file from './missing';
export default file;`,
                },
                bundle: true,
                write: false,
                plugins: [
                    {
                        name: 'resolve',
                        setup(build) {
                            build.onResolve({ filter: /missing/ }, (args) => ({
                                path: fileURLToPath(new URL(args.path, import.meta.url)),
                            }));
                        },
                    },
                    anyFilePlugin({ shouldThrow: true }),
                ],
                logLevel: 'silent',
            });
        } catch (e) {
            err = e;
        }

        expect(err).toBeInstanceOf(Error);
    });
});
