import { t, Visitor } from '@chialab/swc-types';
import { build, treeify } from 'htm/src/build.mjs';

/**
 * @param {*} obj
 * @param {import('@swc/core/types').Span} span
 */
function objectProperties(obj, span) {
    return Object.keys(obj).map((key) => {
        /**
         * @type {import('@swc/core/types').Node[]}
         */
        let values = obj[key].map(
            /**
             * @param {*} valueOrNode
             * @return {import('@swc/core/types').Node}
             */
            (valueOrNode) => (t.isNode(valueOrNode) ? valueOrNode : t.valueToNode(valueOrNode, span))
        );

        let node = values[0];
        if (values.length > 1 && node.type !== 'StringLiteral' && values[1].type !== 'StringLiteral') {
            node = t.binaryExpression('+', t.stringLiteral('', span), /** @type {import('@swc/core/types').Expression} */ (node), span);
        }
        values.slice(1).forEach((value) => {
            node = t.binaryExpression('+', /** @type {import('@swc/core/types').Expression} */ (node), /** @type {import('@swc/core/types').Expression} */ (value), span);
        });

        return t.objectProperty(t.stringLiteral(key, span), /** @type {import('@swc/core/types').Expression} */ (node));
    });
}

/**
 * @param {*} props
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').Node}
 */
function propsNode(props, span) {
    return t.isNode(props) ? props : t.objectExpression(objectProperties(props, span), span);
}

/**
 * @param {*[]} args
 * @param {import('@swc/core/types').Span} span
 */
function spreadNode(args, span) {
    if (args.length === 0) {
        return t.nullLiteral(span);
    }

    if (args.length > 0 && t.isNode(args[0])) {
        args.unshift({});
    }

    // 'Object.assign(x)', can be collapsed to 'x'.
    if (args.length === 1) {
        return propsNode(args[0], span);
    }
    // 'Object.assign({}, x)', can be collapsed to 'x'.
    if (args.length === 2 && !t.isNode(args[0]) && Object.keys(args[0]).length === 0) {
        return propsNode(args[1], span);
    }

    /** @type {(import('@swc/core/types').Property|import('@swc/core/types').SpreadElement)[]} */
    let properties = [];
    args.forEach((arg) => {
        if (t.isNode(arg)) {
            properties.push(t.spreadElement(/** @type {import('@swc/core/types').Expression} */ (arg), span));
        }
        else {
            properties.push(...objectProperties(arg, span));
        }
    });
    return t.objectExpression(properties, span);
}

/**
 * @param {import('@swc/core/types').StringLiteral} tagName
 * @param {*} props
 * @param {import('@swc/core/types').ArrayExpression} children
 * @param {string} pragma
 * @param {import('@swc/core/types').Span} span
 */
function createVNode(tagName, props, children, pragma, span) {
    // Never pass children=[[]].
    if (children.elements.length === 1 && t.isArrayExpression(children.elements[0]) && children.elements[0].elements.length === 0) {
        children = children.elements[0];
    }

    return t.callExpression(
        t.identifier(pragma, span),
        [
            t.expressionStatement(tagName, span),
            t.expressionStatement(props, span),
            ...children.elements.map((child) => t.expressionStatement(/** @type {import('@swc/core/types').Expression} */(child), span)),
        ],
        span
    );
}

/**
 * @param {*} node
 * @param {string} pragma
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').Expression}
 */
function transform(node, pragma, span) {
    if (t.isNode(node)) {
        return /** @type {import('@swc/core/types').Expression} */ (node);
    }
    if (typeof node === 'string') {
        return t.stringLiteral(node, span);
    }
    if (typeof node === 'undefined') {
        return t.identifier('undefined', span);
    }

    let { tag: newTag, props: newProps, children: newChildren } = node;
    newTag = typeof newTag === 'string' ? t.stringLiteral(newTag, span) : newTag;
    newProps = spreadNode(newProps, span);
    newChildren = t.arrayExpression(
        newChildren.map(
            /**
             * @param {*} child
             */
            (child) => transform(child, pragma, span)
        ),
        span
    );
    return createVNode(newTag, newProps, newChildren, pragma, span);
}

export class HtmVisitor extends Visitor {
    constructor({ tag = 'html', pragma = 'h' } = {}) {
        super();
        this.tag = tag;
        this.pragma = pragma;
    }

    /**
     * @param {import('@swc/core/types').TaggedTemplateExpression} exp
     */
    visitTaggedTemplateExpression(exp) {
        super.visitTaggedTemplateExpression(exp);
        let tag = /** @type {import('@swc/core/types').Identifier} */ (exp.tag);
        if (tag.value !== this.tag) {
            return exp;
        }

        let statics = exp.template.quasis.map(e => e.raw.value);
        let expr = exp.template.expressions;

        let tree = treeify(build(statics), expr);
        return !Array.isArray(tree) ?
            transform(tree, this.pragma, exp.span) :
            t.arrayExpression(
                /** @type {*} */
                (
                    tree.map(root =>
                        t.expressionStatement(
                            transform(root, this.pragma, exp.span),
                            exp.span
                        ))
                ),
                exp.span
            );
    }
}

/**
 * @param {{ tag?: string, pragma?: string }} ooptions
 * @return A swc plugin.
 */
export function plugin({ tag = 'html', pragma = 'h' }) {
    return (
        /**
         * @param {import('@swc/core/types').Program} p
         */
        function htmPlugin(p) {
            return new HtmVisitor({ tag, pragma }).visitProgram(p);
        }
    );
}
