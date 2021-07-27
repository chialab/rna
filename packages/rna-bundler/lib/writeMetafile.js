import { writeFile } from 'fs/promises';

/**
 * Writes a JSON file with the metafile contents, for bundle analysis.
 *
 * @param {import('esbuild').Metafile[]} bundleFiles Array of metafiles for all bundle's generated files
 * @param {string} filePath Path of the JSON file to generate, relative to CWD
 * @return {Promise<void>}
 */
export function writeMetafile(bundleFiles, filePath) {
    const bundle = bundleFiles.reduce((bundle, /** @type {import('esbuild').Metafile} */ metaFile) => {
        bundle.inputs = { ...bundle.inputs, ...metaFile.inputs };
        bundle.outputs = { ...bundle.outputs, ...metaFile.outputs };

        return bundle;
    }, { inputs: {}, outputs: {} });

    return writeFile(filePath, JSON.stringify(bundle))
        .then(() => {
            process.stdout.write(`Bundle metafile written to: ${filePath}\n`);
        })
        .catch((err) => {
            process.stderr.write('Error writing JSON metafile\n');
            throw err;
        });
}
