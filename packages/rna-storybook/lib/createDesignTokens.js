import path from 'path';
import { readFile } from 'fs/promises';
import glob from 'fast-glob';

/**
 * @param {string} root
 * @param {string[]} cssFiles
 */
export async function createDesignTokens(root, cssFiles) {
    const designTokensConfig = {
        files: await Promise.all(
            cssFiles
                .map((pattern) =>
                    glob(pattern).then((files) =>
                        Promise.all(
                            files.map((async (filename) => ({
                                filename: path.relative(root, filename),
                                content: (await readFile(filename, 'utf-8')).replace(/\\/g, '\\\\').replace(/\n/g, '\\n'),
                            })))
                        )
                    )
                )
        ),
        options: {
            hideMatchingHardCodedValues: true,
        },
    };

    return `export const parameters = { designToken: JSON.parse('${JSON.stringify(designTokensConfig).replace(/"/g, '\\"').replace(/'/g, '\\\'')}'), };`;
}
