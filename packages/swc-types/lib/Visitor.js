import visitor from '@swc/core/Visitor.js';

/** @type {typeof import('@swc/core/Visitor').default} */
let BaseVisitor = (/** @type {*} */ (visitor));

if (typeof (/** @type {*} */ (BaseVisitor)).default === 'function') {
    BaseVisitor = (/** @type {*} */ (BaseVisitor)).default;
}

export class Visitor extends BaseVisitor {
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
        (/** @type {*} */ (n)).members = (/** @type {*} */ (n)).member = this.visitTsEnumMembers((/** @type {*} */ (n)).member || (/** @type {*} */ (n)).members);
        return n;
    }

    /**
     * @param {import('@swc/core/types').ExprOrSpread} e
     */
    visitArrayElement(e) {
        if (!e) {
            return;
        }

        (/** @type {*} */ (e)).expression = this.visitExpression((/** @type {*} */ (e)).expression);
        return e;
    }
}
