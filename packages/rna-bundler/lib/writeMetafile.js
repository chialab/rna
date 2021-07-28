import { writeFile } from 'fs/promises';

/**
 * Writes a JSON file with the metafile contents, for bundle analysis.
 *
 * @param {import('esbuild').Metafile} manifest Metafile for all bundle's generated files
 * @param {string} filePath Path of the JSON file to generate, relative to CWD
 */
export function writeMetafile(manifest, filePath) {
    return writeFile(filePath, JSON.stringify(manifest))
        .then(() => {
            process.stdout.write(`Bundle metafile written to: ${filePath}\n`);
        })
        .catch((err) => {
            process.stderr.write('Error writing JSON metafile\n');
            throw err;
        });
}
