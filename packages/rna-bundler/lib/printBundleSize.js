import { createReadStream } from 'fs';
import { createGzip, createBrotliCompress } from 'zlib';
import { toReadableSize } from '@chialab/rna-logger';

/**
 * Get the compressed size of a file.
 *
 * @param {string} path File path
 * @param {string} algorithm Compression algorithm to use, one of `gzip` or `brotli`
 * @param {import('zlib').ZlibOptions|import('zlib').BrotliOptions} options Options to tune the compression algorithm
 * @return {Promise<number>} The file size in bytes
 */
function compressFileSize(path, algorithm = 'gzip', options = {}) {
    return new Promise((resolve, reject) => {
        /**
         * Handle compression and stream errors.
         *
         * @param {Error} err
         */
        const handleError = (err) => {
            process.stderr.write(`Error compressing file "${path}": ${err.message}\n`);
            compressMethod.destroy();
            stream.destroy();
            reject(err);
        };

        /** @type {import('zlib').Gzip|import('zlib').BrotliCompress} */
        let compressMethod;
        switch (algorithm) {
            case 'gzip':
                compressMethod = createGzip({ level: 6, ...options });
                break;

            case 'brotli':
                compressMethod = createBrotliCompress(options);
                break;

            default:
                reject(`Compression algorithm ${algorithm} not implemented`);
                return;
        }

        let size = 0;
        const stream = createReadStream(path);
        stream.on('error', handleError);
        compressMethod.on('error', handleError);
        compressMethod.on('data', (buf) => size += buf.length);
        stream.pipe(compressMethod)
            .on('end', () => {
                compressMethod.destroy();
                stream.destroy();
                resolve(size);
            });
    });
}

/**
 * Print bundle size information to console.
 *
 * @param {import('esbuild').Metafile[]} bundleFiles Array of metafiles for all bundle's generated files
 * @param {boolean} compressed Show size compressed with these algorithms. Supports gzip and brotli.
 * @return {Promise<void>}
 */
export async function printBundleSize(bundleFiles, compressed = false) {
    /** @type {{ [path: string]: { [compression: string]: number } }} */
    const fileSizes = bundleFiles.reduce((fileSizesMap, /** @type {import('esbuild').Metafile} */ metaFile) => Object.entries(metaFile.outputs)
        .reduce((/** @type {{ [path: string]: { [compression: string]: number } } }} */ map, [path, output]) => {
            map[path] = { default: output.bytes };

            return map;
        }, fileSizesMap), {});

    if (compressed) {
        await Promise.all(
            Object.keys(fileSizes)
                .filter((path) => /\.(js|html|css|svg|json)$/.test(path))
                .map((path) => Promise.all(['gzip', 'brotli'].map(async (algo) => {
                    try {
                        fileSizes[path][algo] = await compressFileSize(path, algo);
                    } catch (err) {
                        process.stderr.write(`Error while calculating compressed size for file "${path}" with algorithm ${algo}: ${err}\n`);
                        fileSizes[path][algo] = 0;
                    }
                })))
        );
    }

    const totalSizes = /** @type {{ [compression: string]: number }} */ Object.values(fileSizes)
        .reduce((/** @type {{ [compression: string]: number }} */ totals, /** @type {{ [compression: string]: number }} */ sizes) => {
            for (const compression in sizes) {
                if (!totals[compression]) {
                    totals[compression] = 0;
                }

                totals[compression] += sizes[compression];
            }

            return totals;
        }, {});

    const longestFilename = Object.keys(fileSizes).reduce((longest, path) => Math.max(longest, path.length), 0);

    /**
     * Format compression sizes for output.
     * Skips 'default' size.
     *
     * @param {{ [compression: string]: number }} sizes
     * @return string[]
     */
    const formatSizes = (sizes) => {
        const formatted = [];
        for (const compression of Object.keys(sizes).sort()) {
            if (compression === 'default') {
                continue;
            }

            formatted.push(`${toReadableSize(sizes[compression])} ${compression}`);
        }

        return formatted;
    };

    process.stdout.write('Generated bundle files:\n');
    Object.entries(fileSizes)
        .forEach(([path, sizes]) => process.stdout.write(`\t${path.padEnd(longestFilename, ' ')}\t${toReadableSize(sizes.default || 0)}\t${formatSizes(sizes).join(', ')}\n`));
    process.stdout.write(`Total bundle size: ${[toReadableSize(totalSizes.default || 0)].concat(formatSizes(totalSizes)).join(', ')}\n`);
}
