/**
 * @import { Block } from 'comment-parser'
 * @import { SourceFile } from './source-file.js'
 * @import { CustomElementField, FunctionLike, PropertyLike } from 'custom-elements-manifest'
 * @import { Node } from '@oxc-project/types'
 */
import { parse } from 'comment-parser';
import { print as corePrint } from 'esrap';
import tsx from 'esrap/languages/tsx';

/**
 * Checks if the given module specifier is a bare module specifier, which typically refers to a package name or a path that does not start with a relative or absolute path indicator (e.g., './' or '/').
 * @param {string} specifier - The module specifier to check.
 * @returns {boolean} True if the specifier is a bare module specifier, false otherwise.
 */
export function isBareModuleSpecifier(specifier) {
    return !!specifier[0].match(/[@a-zA-Z]/g);
}

/**
 * Parses JSDoc comments from a source file at a given position, returning an array of JSDoc blocks. It finds the nearest comment before the specified position and uses the comment-parser library to extract JSDoc information, including descriptions and tags.
 * @param {SourceFile} sourceFile - The source file containing the comments to parse.
 * @param {number} start - The position in the source file to find the nearest comment before it.
 * @param {number} [prev] - An optional parameter to specify a previous position, used to filter out comments that are too far back.
 * @returns {Block[]} An array of JSDoc blocks parsed from the nearest comment.
 */
export function parseJSDoc(sourceFile, start, prev = 0) {
    const nearestComment = sourceFile.comments
        .filter((c) => c.end <= start)
        .sort((a, b) => a.start - b.start)
        .at(-1);

    if (!nearestComment || nearestComment.start < prev) {
        return [];
    }

    return parse(nearestComment.type === 'Block' ? `/*${nearestComment.value}*/` : `//${nearestComment.value}`).map(
        (comment) => {
            if (comment.description) {
                comment.description = comment.description.replace(/^-\s/, '').trim();
            }

            comment.tags.forEach((tag) => {
                if (tag.description) {
                    tag.description = tag.description.replace(/^-\s/, '').trim();
                }

                if (tag.type) {
                    tag.type = tag.type.replace(/(import\(.+?\).)/g, '').trim();
                }
            });

            return comment;
        }
    );
}

/**
 * Checks if any of the JSDoc blocks contain an @ignore or @internal tag, which indicates that the associated code should be ignored in documentation generation.
 * @param {Block[]} jsdoc - An array of JSDoc blocks to check.
 * @returns {boolean} True if any block contains an @ignore or @internal tag, false otherwise.
 */
export function hasIgnoreJSDoc(jsdoc) {
    return jsdoc.some((block) => block.tags.some((tag) => ['ignore', 'internal'].includes(tag.tag)));
}

/**
 * Decorates a documentation object (either a property or a function) with information extracted from JSDoc comments, such as description, type, summary, and deprecation status.
 * @param {PropertyLike | FunctionLike} doc - The documentation object to decorate.
 * @param {Block[]} jsdoc - An array of JSDoc blocks to use for decoration.
 */
export function decorateWithJSDoc(doc, jsdoc) {
    jsdoc.forEach((block) => {
        if (block.description) {
            doc.description = block.description;
        }

        block.tags.forEach((tag) => {
            if (tag.tag === 'type') {
                if (tag.type) {
                    /** @type {PropertyLike} */ (doc).type = {
                        text: tag.type,
                    };
                }
                if (tag.description) {
                    doc.description = `${tag.name || ''} ${tag.description || ''}`.trim();
                }
            }

            /** @summary */
            if (tag.tag === 'summary' && tag.description) {
                doc.summary = `${tag.name || ''} ${tag.description || ''}`.trim();
            }

            /** @deprecated */
            if (tag.tag === 'deprecated') {
                const message = `${tag.name || ''} ${tag.description || ''}`.trim();
                doc.deprecated = message || 'true';
            }
        });
    });
}

/**
 * Decorates a class field with JSDoc tags, setting properties like readonly, reflects, default value, and privacy based on the tags found in the JSDoc comments.
 * @param {PropertyLike} doc - The class field documentation object to decorate.
 * @param {Block[]} jsdoc - An array of JSDoc blocks to use for decoration.
 */
export function decorateClassFieldWithJSDoc(doc, jsdoc) {
    decorateWithJSDoc(doc, jsdoc);
    jsdoc.forEach((block) => {
        block.tags.forEach((tag) => {
            /** @readonly */
            if (tag.tag === 'readonly') {
                doc.readonly = true;
            }

            /** @reflect */
            if (tag.tag === 'reflect') {
                /** @type {CustomElementField} */ (doc).reflects = true;
            }

            /** @default */
            if (tag.tag === 'default') {
                doc.default ??= `${tag.name || ''} ${tag.description || ''}`.trim();
            }

            /**
             * Overwrite privacy
             * @public
             * @private
             * @protected
             */
            switch (tag.tag) {
                case 'public':
                    /** @type {CustomElementField} */ (doc).privacy = 'public';
                    break;
                case 'private':
                    /** @type {CustomElementField} */ (doc).privacy = 'private';
                    break;
                case 'protected':
                    /** @type {CustomElementField} */ (doc).privacy = 'protected';
                    break;
            }
        });
    });
}

/**
 * Prints the given code using esrap with the tsx language configuration.
 * @param {Node} node - The AST node to print.
 * @returns {string} The generated code as a string.
 */
export function print(node) {
    return corePrint(node, tsx()).code;
}

/**
 * Iterates through an array of callbacks, calling each one with an abort function.
 * If a callback calls the abort function, the iteration stops and the current result is returned.
 * @template {(abort: () => void) => any} T - The type of the callback functions in the array.
 * @param {T[]} arr - An array of callback functions.
 * @param {number} [pos] - The current position in the array.
 * @returns {ReturnType<T> | void} The result of the last executed callback or undefined if none were executed.
 */
export function iterateCallbacks(arr, pos = 0) {
    const callback = arr[pos];
    if (!callback) {
        return;
    }

    let aborted = false;
    const result = callback(() => {
        aborted = true;
    });
    if (result instanceof Promise) {
        return /** @type {ReturnType<T>} */ (
            result.then((res) => {
                if (aborted) {
                    return res;
                }
                return iterateCallbacks(arr, pos + 1);
            })
        );
    }
    if (aborted) {
        return result;
    }
    return iterateCallbacks(arr, pos + 1);
}
