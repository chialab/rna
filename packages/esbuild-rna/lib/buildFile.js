import path from 'path';
import crypto from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { createResult } from './createResult.js';
import { getRootDirByOptions, getOutputDirByOptions } from './options.js';

/**
 * @param {string} from
 * @param {import('esbuild').BuildOptions} options
 */
export async function esbuildFile(from, options = {}) {
    const { assetNames = '[name]' } = options;
    const rootDir = getRootDirByOptions(options);
    const outDir = getOutputDirByOptions(options);

    const inputFile = path.relative(rootDir, from);
    const ext = path.extname(inputFile);
    const basename = path.basename(inputFile, ext);
    const buffer = await readFile(inputFile);
    const computedName = assetNames
        .replace('[name]', basename)
        .replace('[hash]', () => {
            const hash = crypto.createHash('sha1');
            hash.update(buffer);
            return hash.digest('hex').substr(0, 8);
        });

    const outputFile = path.join(outDir, `${computedName}${ext}`);
    await mkdir(path.dirname(outputFile), {
        recursive: true,
    });
    await writeFile(outputFile, buffer);

    const relativeOutputFile = path.relative(rootDir, outputFile);
    const bytes = Buffer.byteLength(buffer);

    return {
        outputFile: relativeOutputFile,
        result: createResult(
            {
                inputs: {
                    [inputFile]: {
                        bytes,
                        imports: [],
                    },
                },
                outputs: {
                    [relativeOutputFile]: {
                        bytes,
                        inputs: {
                            [inputFile]: {
                                bytesInOutput: bytes,
                            },
                        },
                        imports: [],
                        exports: [],
                        entryPoint: inputFile,
                    },
                },
            }
        ),
    };
}
