import { print } from '@swc/core';

/**
 * @param {import('./types.js').Node} node
 */
export const generate = async (node) => {
    if (node.type === 'Program' || node.type === 'Module' || node.type === 'Script') {
        const output = await print(/** @type {import('./types.js').Program} */(node));
        return output.code;
    }

    const expression = /** @type {import('./types.js').Expression} */ (node);

    const output = await print({
        type: 'Module',
        body: [{
            type: 'ExpressionStatement',
            expression,
            span: {
                start: 0,
                end: 0,
                ctxt: 0,
            },
        }],
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
        interpreter: '/usr/bin/node',
    });
    return output.code;
};
