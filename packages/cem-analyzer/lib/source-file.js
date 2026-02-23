/**
 * @import { Program } from '@oxc-project/types'
 */

/**
 * From oxc-parser
 * @typedef {Object} Comment
 * @property {"Line" | "Block"} type - The type of the comment (line or block).
 * @property {string} value - The content of the comment.
 * @property {number} start - The starting index of the comment in the source code.
 * @property {number} end - The ending index of the comment in the source code.
 */

/**
 * @typedef {Object} SourceFile
 * @property {string} fileName - The name of the source file.
 * @property {Program} program - The parsed program (AST) of the source file.
 * @property {Comment[]} comments - An array of comments found in the source file.
 */

/**
 * Creates a SourceFile object by parsing the given code using oxc-parser.
 * @param {string} fileName - The name of the source file.
 * @param {string} code - The source code to parse.
 * @returns {Promise<SourceFile>} A promise that resolves to a SourceFile object.
 */
export async function createSourceFile(fileName, code) {
    const { parse } = await import('oxc-parser').catch(() => {
        throw new Error("Failed to load oxc-parser. Please make sure it's installed.");
    });

    const { program, comments } = await parse(fileName, code);

    return {
        fileName,
        program,
        comments,
    };
}

/**
 * Creates an array of SourceFile objects by parsing the given files using oxc-parser.
 * @param {Record<string, string>} files - An object where keys are file names and values are source code.
 * @returns {Promise<SourceFile[]>} A promise that resolves to an array of SourceFile objects.
 */
export async function createSourceFiles(files) {
    return Promise.all(Object.entries(files).map(([fileName, code]) => createSourceFile(fileName, code)));
}
