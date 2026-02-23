import { writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Write manifest.json
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string} outputFile The output file or dir.
 * @param {string} publicPath The public path.
 */
export async function writeManifestJson(result, outputFile, publicPath = '/') {
    const { metafile } = result;
    if (!metafile) {
        return;
    }

    const outputDir = path.extname(outputFile) ? path.dirname(outputFile) : outputFile;
    const resolvedOutputFile = path.extname(outputFile) ? outputFile : path.join(outputDir, 'manifest.json');

    const { outputs } = metafile;
    const manifestJson = Object.entries(outputs).reduce(
        (json, [fileName, output]) => {
            const outputFile = path.join(publicPath, path.relative(outputDir, fileName));

            if (fileName.endsWith('.map')) {
                const entry = outputs[fileName.replace(/\.map$/, '')].entryPoint;
                if (entry) {
                    json[path.join(path.dirname(fileName), `${path.basename(entry)}.map`)] = outputFile;
                }

                return json;
            }

            const entry = output.entryPoint || Object.keys(output.inputs)[0] || undefined;
            if (entry) {
                json[path.join(path.dirname(fileName), path.basename(entry))] = outputFile;
            }
            return json;
        },
        /** @type {{[file: string]: string}} */ ({})
    );

    await writeFile(resolvedOutputFile, JSON.stringify(manifestJson, null, 2));
}
