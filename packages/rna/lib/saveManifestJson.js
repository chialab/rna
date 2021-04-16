import path from 'path';
import { promises } from 'fs';

const { writeFile } = promises;

/**
 * Write manifest.json
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} outputDir The output dir.
 * @param {string} publicDir The public dir.
 */
export async function saveManifestJson(result, outputDir, publicDir = outputDir) {
    let { metafile } = result;
    if (!metafile) {
        return;
    }

    let { outputs } = metafile;

    /**
     * @type {{[file: string]: string}}
     */
    let manifestJson = {};
    for (let k in outputs) {
        let entry = outputs[k].entryPoint || Object.keys(outputs[k].inputs)[0] || undefined;
        if (entry) {
            manifestJson[path.join(path.dirname(k), path.basename(entry))] = `/${path.relative(publicDir, k)}`;
        } else if (k.match(/\.map$/)) {
            entry = outputs[k.replace(/\.map$/, '')].entryPoint;
            if (entry) {
                manifestJson[path.join(path.dirname(k), `${path.basename(entry)}.map`)] = `/${path.relative(publicDir, k)}`;
            }
        }
    }
    await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2));
}
