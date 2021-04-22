import { t, Visitor } from '@chialab/swc-types';
import { build, treeify } from 'htm/src/build.mjs';

/**
 * @param {*} obj
 */
function objectProperties(obj) {
    return Object.keys(obj).map((key) => {
        /**
         * @type {import('@swc/core/types').Node[]}
         */
        let values = obj[key].map(
            /**
             * @param {*} valueOrNode
             * @return {import('@swc/core/types').Node}
             */
            (valueOrNode) => (t.isNode(valueOrNode) ? valueOrNode : t.valueToNode(valueOrNode))
        );

        let node = values[0];
        if (values.length > 1 && node.type !== 'StringLiteral' && values[1].type !== 'StringLiteral') {
            node = t.binaryExpression('+', t.stringLiteral(''), /** @type {import('@swc/core/types').Expression} */ (node));
        }
        values.slice(1).forEach((value) => {
            node = t.binaryExpression('+', /** @type {import('@swc/core/types').Expression} */ (node), /** @type {import('@swc/core/types').Expression} */ (value));
        });

        return t.objectProperty(t.stringLiteral(key), /** @type {import('@swc/core/types').Expression} */ (node));
    });
}

/**
 * @param {*} props
 * @return {import('@swc/core/types').Node}
 */
function propsNode(props) {
    return t.isNode(props) ? props : t.objectExpression(objectProperties(props));
}

/**
 * @param {*[]} args
 * @returns
 */
function spreadNode(args) {
    if (args.length === 0) {
        return t.nullLiteral();
    }

    if (args.length > 0 && t.isNode(args[0])) {
        args.unshift({});
    }

    // 'Object.assign(x)', can be collapsed to 'x'.
    if (args.length === 1) {
        return propsNode(args[0]);
    }
    // 'Object.assign({}, x)', can be collapsed to 'x'.
    if (args.length === 2 && !t.isNode(args[0]) && Object.keys(args[0]).length === 0) {
        return propsNode(args[1]);
    }

    /** @type {(import('@swc/core/types').Property|import('@swc/core/types').SpreadElement)[]} */
    let properties = [];
    args.forEach((arg) => {
        if (t.isNode(arg)) {
            properties.push(t.spreadElement(/** @type {import('@swc/core/types').Expression} */ (arg)));
        }
        else {
            properties.push(...objectProperties(arg));
        }
    });
    return t.objectExpression(properties);
}

/**
 * @param {import('@swc/core/types').StringLiteral} tagName
 * @param {*} props
 * @param {import('@swc/core/types').ArrayExpression} children
 * @param {string} pragma
 */
function createVNode(tagName, props, children, pragma) {
    // Never pass children=[[]].
    if (children.elements.length === 1 && t.isArrayExpression(children.elements[0]) && children.elements[0].elements.length === 0) {
        children = children.elements[0];
    }

    return t.callExpression(
        t.identifier(pragma),
        [
            t.expressionStatement(tagName),
            t.expressionStatement(props),
            ...children.elements.map((child) => t.expressionStatement(/** @type {import('@swc/core/types').Expression} */(child))),
        ]);
}

/**
 * @param {*} node
 * @param {string} pragma
 * @return {import('@swc/core/types').Expression}
 */
function transform(node, pragma) {
    if (t.isNode(node)) {
        return /** @type {import('@swc/core/types').Expression} */ (node);
    }
    if (typeof node === 'string') {
        return t.stringLiteral(node);
    }
    if (typeof node === 'undefined') {
        return t.identifier('undefined');
    }

    let { tag: newTag, props: newProps, children: newChildren } = node;
    newTag = typeof newTag === 'string' ? t.stringLiteral(newTag) : newTag;
    newProps = spreadNode(newProps);
    newChildren = t.arrayExpression(newChildren.map(
        /**
         * @param {*} child
         */
        (child) => transform(child, pragma))
    );
    return createVNode(newTag, newProps, newChildren, pragma);
}

export class HtmVisitor extends Visitor {
    constructor({ tag = 'html', pragma = 'h' } = {}) {
        super();
        this.tag = tag;
        this.pragma = pragma;
    }

    /**
     * @param {import('@swc/core/types').TsType} t
     */
    visitTsType(t) {
        return t;
    }

    /**
     * @param {import('@swc/core/types').TsEnumDeclaration} n
     */
    visitTsEnumDeclaration(n) {
        n.id = this.visitIdentifier(n.id);
        n.member = this.visitTsEnumMembers(n.member || (/** @type {*} */ (n)).members);
        return n;
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
            transform(tree, this.pragma) :
            t.arrayExpression(/** @type {*} */ (tree.map(root => t.expressionStatement(transform(root, this.pragma)))));
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
