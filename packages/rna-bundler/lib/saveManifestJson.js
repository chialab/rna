import path from 'path';
import { promises } from 'fs';

const { writeFile } = promises;

/**
 * Write manifest.json
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} outputFile The output file or dir.
 * @param {string} publicPath The public path.
 */
export async function saveManifestJson(result, outputFile, publicPath = '/') {
    const { metafile } = result;
    if (!metafile) {
        return;
    }

    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    outputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'entrypoints.json');

    const { outputs } = metafile;

    /**
     * @type {{[file: string]: string}}
     */
    const manifestJson = {};
    for (let k in outputs) {
        let entry = outputs[k].entryPoint || Object.keys(outputs[k].inputs)[0] || undefined;
        if (entry) {
            manifestJson[path.join(path.dirname(k), path.basename(entry))] = `${publicPath.replace(/\/+$/, '')}/${path.relative(outputDir, k)}`;
        } else if (k.match(/\.map$/)) {
            entry = outputs[k.replace(/\.map$/, '')].entryPoint;
            if (entry) {
                manifestJson[path.join(path.dirname(k), `${path.basename(entry)}.map`)] = `${publicPath.replace(/\/+$/, '')}/${path.relative(outputDir, k)}`;
            }
        }
    }
    await writeFile(outputFile, JSON.stringify(manifestJson, null, 2));
}
