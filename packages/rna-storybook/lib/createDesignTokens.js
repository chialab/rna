import { readFile } from 'fs/promises';
import glob from 'fast-glob';
import { TokenSourceType } from 'storybook-design-token/dist/types/token.types.js';
import { parseCssFiles } from 'storybook-design-token/dist/parsers/postcss.parser.js';

/**
 * @param {string|string[]} globs
 */
export async function createDesignTokens(globs) {
    const patterns = Array.isArray(globs) ? globs : [globs];
    const tokenFiles = (await Promise.all(
        patterns.map((pattern) =>
            glob(pattern).then((files) =>
                Promise.all(
                    files.map((async (filename) => ({
                        filename,
                        content: await readFile(filename, 'utf-8'),
                    })))
                )
            )
        )
    )).flat();

    const cssTokens = await parseCssFiles(
        tokenFiles.filter((file) => file.filename.endsWith('.css')),
        TokenSourceType.CSS,
        true
    );

    return { cssTokens };
}
