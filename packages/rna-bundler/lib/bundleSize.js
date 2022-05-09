import { createReadStream } from 'fs';
import { createGzip, createBrotliCompress } from 'zlib';

/**
 * Get the gzipped size of a file.
 *
 * @param {string} path File path
 * @returns {Promise<number>} The file size in bytes
 */
export function gzipSize(path) {
    return compressFileSize(path, createGzip({ level: 6 }));
}

/**
 * Get the brotli size of a file.
 *
 * @param {string} path File path
 * @returns {Promise<number>} The file size in bytes
 */
export function brotliSize(path) {
    return compressFileSize(path, createBrotliCompress());
}

/**
 * Get the compressed size of a file.
 *
 * @param {string} path File path
 * @param {import('zlib').BrotliCompress|import('zlib').Gzip} compressMethod Compression algorithm to use, one of `gzip` or `brotli`
 * @returns {Promise<number>} The file size in bytes
 */
export function compressFileSize(path, compressMethod) {
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

        let size = 0;
        const stream = createReadStream(path);
        stream.on('error', handleError);
        compressMethod.on('error', handleError);
        compressMethod.on('data', (buf) => size += buf.length);
        stream.pipe(compressMethod)
            .on('end', () => {
                resolve(size);
                compressMethod.destroy();
                stream.destroy();
            });
    });
}

/**
 * Get output bundle size.
 *
 * @param {import('esbuild').Metafile} metafile The metafile for all bundle's generated files
 * @param {boolean} compressed Show size compressed with these algorithms. Supports gzip and brotli.
 */
export async function bundleSize(metafile, compressed = false) {
    const fileSizes = Object.entries(metafile.outputs)
        .reduce((map, [path, output]) => {
            if (!path.endsWith('.map')) {
                map[path] = { size: output.bytes };
            }

            return map;
        }, /** @type {{ [path: string]: { size: number, brotli?: number, gzip?: number } } }} */ ({}));

    if (compressed) {
        await Promise.all(
            Object.keys(fileSizes)
                .filter((path) => /\.(js|html|css|svg|json)$/.test(path))
                .map(async (path) => {
                    const [gzip, brotli] = await Promise.all([
                        gzipSize(path).catch(() => 0),
                        brotliSize(path).catch(() => 0),
                    ]);

                    fileSizes[path].gzip = gzip;
                    fileSizes[path].brotli = brotli;
                })
        );
    }

    return fileSizes;
}
