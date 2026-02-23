/**
 * @import { ArrowFunctionExpression, Function as IFunction, TSTypeAnnotation } from '@oxc-project/types'
 * @import { Block } from 'comment-parser'
 * @import { FunctionDeclaration, Parameter } from 'custom-elements-manifest'
 * @import { Context } from '../generate'
 */
import { decorateWithJSDoc } from '../utils.js';

/**
 * @param {Context} context
 * @param {ArrowFunctionExpression | IFunction} node
 * @param {Block[]} [jsdoc=context.parseJSDoc(node)]
 * @returns {FunctionDeclaration}
 */
export function createFunction(context, node, jsdoc = context.parseJSDoc(node)) {
    /** @type {FunctionDeclaration} */
    const functionLikeTemplate = {
        kind: 'function',
        name: node.id?.type === 'Identifier' ? node.id.name : '',
        description: undefined,
        parameters: undefined,
        return: undefined,
    };

    if (node.returnType) {
        functionLikeTemplate.return = {
            type: {
                text: context.print(node.returnType.typeAnnotation),
            },
        };
    }

    /** @type {Parameter[]} */
    const parameters = [];
    node.params.forEach((param, index) => {
        /** @type {Parameter} */
        const parameter = {
            name: param.type === 'Identifier' ? param.name : `param${index}`,
        };
        if (param.type === 'Identifier') {
            if (param.typeAnnotation) {
                /** @type {{ typeAnnotation: TSTypeAnnotation }} */
                const typedParam = param;
                parameter.type = {
                    text: context.print(typedParam.typeAnnotation.typeAnnotation),
                };
            }
        }
        parameters.push(parameter);
    });
    if (parameters.length) {
        functionLikeTemplate.parameters = parameters;
    }

    decorateWithJSDoc(functionLikeTemplate, jsdoc);

    jsdoc.forEach((block) => {
        block.tags.forEach((tag) => {
            if (tag.tag === 'param') {
                const parameter = functionLikeTemplate.parameters?.find((parameter) => parameter.name === tag.name) || {
                    name: tag.name,
                };
                const parameterAlreadyExists = !!parameter;
                const parameterTemplate = parameter || {};

                if (tag.description) {
                    parameterTemplate.description = tag.description;
                }

                /**
                 * If its bracketed, that means its optional
                 * @example [foo]
                 */
                if (tag.optional) {
                    parameterTemplate.optional = true;
                }

                if (tag.type) {
                    parameterTemplate.type = {
                        text: tag.type,
                    };
                }

                if (!parameterAlreadyExists) {
                    functionLikeTemplate.parameters ??= [];
                    functionLikeTemplate.parameters?.push(parameterTemplate);
                }
            }

            /** @returns */
            if ((tag.tag === 'returns' || tag.tag === 'return') && tag.type) {
                functionLikeTemplate.return = {
                    type: {
                        text: tag.type,
                    },
                };
            }
        });
    });

    return functionLikeTemplate;
}
