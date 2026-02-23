import { parse, walk } from '@chialab/estransform';

/**
 * Create a blob proxy worker code.
 * @param {string} argument The url reference.
 * @param {'script' | 'module'} [type] The type of the worker.
 */
function createBlobProxy(argument, type = 'script') {
    const blobContent =
        type === 'module' ? `'import "' + ${argument} + '";'` : `'importScripts("' + ${argument} + '");'`;

    return `URL.createObjectURL(new Blob([${blobContent}], { type: 'text/javascript' }))`;
}

/**
 * Avoid DOMException while importing Web Workers from a different origin.
 * @param {{ constructors?: string[] }} options
 * @returns {import('vite').Plugin}
 */
export default function workerProxy({ constructors = ['Worker', 'SharedWorker'] } = {}) {
    const variants = constructors.reduce(
        (acc, Ctr) => {
            acc.push(Ctr, `window.${Ctr}`, `globalThis.${Ctr}`, `self.${Ctr}`);
            return acc;
        },
        /** @type {string[]} */ ([])
    );

    return {
        name: 'worker-proxy',

        async transform(code, id) {
            if (!variants.find((ctr) => code.includes(`new ${ctr}`))) {
                return;
            }

            const { ast, helpers } = await parse(code, id);

            walk(ast, {
                async NewExpression(node) {
                    const callee = node.callee;
                    if (callee.type !== 'Identifier' || !constructors.includes(callee.name)) {
                        if (callee.type !== 'StaticMemberExpression') {
                            return;
                        }
                        if (
                            callee.object.type !== 'Identifier' ||
                            !['window', 'globalThis', 'self', 'global'].includes(callee.object.name) ||
                            callee.property.type !== 'Identifier' ||
                            !constructors.includes(callee.property.name)
                        ) {
                            return;
                        }
                    }

                    const argument = node.arguments[0];
                    if (!argument) {
                        return;
                    }

                    const options = node.arguments[1];
                    /**
                     * @type {'script' | 'module'}
                     */
                    let type = 'script';
                    if (options && options.type === 'ObjectExpression') {
                        for (const property of options.properties) {
                            if (
                                property.type === 'ObjectProperty' &&
                                property.key.type === 'Identifier' &&
                                property.key.name === 'type' &&
                                property.value.type === 'StringLiteral'
                            ) {
                                type = property.value.value;
                                break;
                            }
                        }
                    }

                    const arg = helpers.substring(argument.start, argument.end);
                    helpers.overwrite(argument.start, argument.end, createBlobProxy(arg, type));
                },
            });

            if (!helpers.isDirty()) {
                return;
            }

            return helpers.generate({
                sourcemap: true,
                sourcesContent: true,
            });
        },
    };
}
