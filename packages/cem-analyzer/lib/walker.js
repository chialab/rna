/**
 * @import { Node } from '@oxc-project/types'
 */
import { iterateCallbacks } from './utils.js';

/**
 * @see https://github.com/oxc-project/oxc/
 */
const { freeze } = Object;

/**
 * @type {ReadonlyArray<string>}
 */
const $EMPTY = freeze([]);
const DECORATORS__KEY__TYPE_ANNOTATION__VALUE = freeze(['decorators', 'key', 'typeAnnotation', 'value']);
const LEFT__RIGHT = freeze(['left', 'right']);
const ARGUMENT = freeze(['argument']);
const BODY = freeze(['body']);
const LABEL = freeze(['label']);
const CALLEE__TYPE_ARGUMENTS__ARGUMENTS = freeze(['callee', 'typeArguments', 'arguments']);
const EXPRESSION = freeze(['expression']);
const DECORATORS__ID__TYPE_PARAMETERS__SUPER_CLASS__SUPER_TYPE_ARGUMENTS__IMPLEMENTS__BODY = freeze([
    'decorators',
    'id',
    'typeParameters',
    'superClass',
    'superTypeArguments',
    'implements',
    'body',
]);
const TEST__CONSEQUENT__ALTERNATE = freeze(['test', 'consequent', 'alternate']);
const LEFT__RIGHT__BODY = freeze(['left', 'right', 'body']);
const ID__TYPE_PARAMETERS__PARAMS__RETURN_TYPE__BODY = freeze(['id', 'typeParameters', 'params', 'returnType', 'body']);
const KEY__VALUE = freeze(['key', 'value']);
const LOCAL = freeze(['local']);
const OBJECT__PROPERTY = freeze(['object', 'property']);
const DECORATORS__KEY__TYPE_ANNOTATION = freeze(['decorators', 'key', 'typeAnnotation']);
const EXPRESSION__TYPE_ANNOTATION = freeze(['expression', 'typeAnnotation']);
const TYPE_PARAMETERS__PARAMS__RETURN_TYPE = freeze(['typeParameters', 'params', 'returnType']);
const EXPRESSION__TYPE_ARGUMENTS = freeze(['expression', 'typeArguments']);
const MEMBERS = freeze(['members']);
const ID__BODY = freeze(['id', 'body']);
const TYPES = freeze(['types']);
const TYPE_ANNOTATION = freeze(['typeAnnotation']);
const PARAMS = freeze(['params']);

/**
 * @type {Record<string, ReadonlyArray<string>>}
 */
const visitorKeys = freeze({
    // Leaf nodes
    DebuggerStatement: $EMPTY,
    EmptyStatement: $EMPTY,
    Literal: $EMPTY,
    PrivateIdentifier: $EMPTY,
    Super: $EMPTY,
    TemplateElement: $EMPTY,
    ThisExpression: $EMPTY,
    JSXClosingFragment: $EMPTY,
    JSXEmptyExpression: $EMPTY,
    JSXIdentifier: $EMPTY,
    JSXOpeningFragment: $EMPTY,
    JSXText: $EMPTY,
    TSAnyKeyword: $EMPTY,
    TSBigIntKeyword: $EMPTY,
    TSBooleanKeyword: $EMPTY,
    TSIntrinsicKeyword: $EMPTY,
    TSJSDocUnknownType: $EMPTY,
    TSNeverKeyword: $EMPTY,
    TSNullKeyword: $EMPTY,
    TSNumberKeyword: $EMPTY,
    TSObjectKeyword: $EMPTY,
    TSStringKeyword: $EMPTY,
    TSSymbolKeyword: $EMPTY,
    TSThisType: $EMPTY,
    TSUndefinedKeyword: $EMPTY,
    TSUnknownKeyword: $EMPTY,
    TSVoidKeyword: $EMPTY,
    // Non-leaf nodes
    AccessorProperty: DECORATORS__KEY__TYPE_ANNOTATION__VALUE,
    ArrayExpression: freeze(['elements']),
    ArrayPattern: freeze(['decorators', 'elements', 'typeAnnotation']),
    ArrowFunctionExpression: freeze(['typeParameters', 'params', 'returnType', 'body']),
    AssignmentExpression: LEFT__RIGHT,
    AssignmentPattern: freeze(['decorators', 'left', 'right', 'typeAnnotation']),
    AwaitExpression: ARGUMENT,
    BinaryExpression: LEFT__RIGHT,
    BlockStatement: BODY,
    BreakStatement: LABEL,
    CallExpression: CALLEE__TYPE_ARGUMENTS__ARGUMENTS,
    CatchClause: freeze(['param', 'body']),
    ChainExpression: EXPRESSION,
    ClassBody: BODY,
    ClassDeclaration: DECORATORS__ID__TYPE_PARAMETERS__SUPER_CLASS__SUPER_TYPE_ARGUMENTS__IMPLEMENTS__BODY,
    ClassExpression: DECORATORS__ID__TYPE_PARAMETERS__SUPER_CLASS__SUPER_TYPE_ARGUMENTS__IMPLEMENTS__BODY,
    ConditionalExpression: TEST__CONSEQUENT__ALTERNATE,
    ContinueStatement: LABEL,
    Decorator: EXPRESSION,
    DoWhileStatement: freeze(['body', 'test']),
    ExportAllDeclaration: freeze(['exported', 'source', 'attributes']),
    ExportDefaultDeclaration: freeze(['declaration']),
    ExportNamedDeclaration: freeze(['declaration', 'specifiers', 'source', 'attributes']),
    ExportSpecifier: freeze(['local', 'exported']),
    ExpressionStatement: EXPRESSION,
    ForInStatement: LEFT__RIGHT__BODY,
    ForOfStatement: LEFT__RIGHT__BODY,
    ForStatement: freeze(['init', 'test', 'update', 'body']),
    FunctionDeclaration: ID__TYPE_PARAMETERS__PARAMS__RETURN_TYPE__BODY,
    FunctionExpression: ID__TYPE_PARAMETERS__PARAMS__RETURN_TYPE__BODY,
    Identifier: freeze(['decorators', 'typeAnnotation']),
    IfStatement: TEST__CONSEQUENT__ALTERNATE,
    ImportAttribute: KEY__VALUE,
    ImportDeclaration: freeze(['specifiers', 'source', 'attributes']),
    ImportDefaultSpecifier: LOCAL,
    ImportExpression: freeze(['source', 'options']),
    ImportNamespaceSpecifier: LOCAL,
    ImportSpecifier: freeze(['imported', 'local']),
    LabeledStatement: freeze(['label', 'body']),
    LogicalExpression: LEFT__RIGHT,
    MemberExpression: OBJECT__PROPERTY,
    MetaProperty: freeze(['meta', 'property']),
    MethodDefinition: freeze(['decorators', 'key', 'value']),
    NewExpression: CALLEE__TYPE_ARGUMENTS__ARGUMENTS,
    ObjectExpression: freeze(['properties']),
    ObjectPattern: freeze(['decorators', 'properties', 'typeAnnotation']),
    ParenthesizedExpression: EXPRESSION,
    Program: BODY,
    Property: KEY__VALUE,
    PropertyDefinition: DECORATORS__KEY__TYPE_ANNOTATION__VALUE,
    RestElement: freeze(['decorators', 'argument', 'typeAnnotation']),
    ReturnStatement: ARGUMENT,
    SequenceExpression: freeze(['expressions']),
    SpreadElement: ARGUMENT,
    StaticBlock: BODY,
    SwitchCase: freeze(['test', 'consequent']),
    SwitchStatement: freeze(['discriminant', 'cases']),
    TaggedTemplateExpression: freeze(['tag', 'typeArguments', 'quasi']),
    TemplateLiteral: freeze(['quasis', 'expressions']),
    ThrowStatement: ARGUMENT,
    TryStatement: freeze(['block', 'handler', 'finalizer']),
    UnaryExpression: ARGUMENT,
    UpdateExpression: ARGUMENT,
    V8IntrinsicExpression: freeze(['name', 'arguments']),
    VariableDeclaration: freeze(['declarations']),
    VariableDeclarator: freeze(['id', 'init']),
    WhileStatement: freeze(['test', 'body']),
    WithStatement: freeze(['object', 'body']),
    YieldExpression: ARGUMENT,
    JSXAttribute: freeze(['name', 'value']),
    JSXClosingElement: freeze(['name']),
    JSXElement: freeze(['openingElement', 'children', 'closingElement']),
    JSXExpressionContainer: EXPRESSION,
    JSXFragment: freeze(['openingFragment', 'children', 'closingFragment']),
    JSXMemberExpression: OBJECT__PROPERTY,
    JSXNamespacedName: freeze(['namespace', 'name']),
    JSXOpeningElement: freeze(['name', 'typeArguments', 'attributes']),
    JSXSpreadAttribute: ARGUMENT,
    JSXSpreadChild: EXPRESSION,
    TSAbstractAccessorProperty: DECORATORS__KEY__TYPE_ANNOTATION,
    TSAbstractMethodDefinition: KEY__VALUE,
    TSAbstractPropertyDefinition: DECORATORS__KEY__TYPE_ANNOTATION,
    TSArrayType: freeze(['elementType']),
    TSAsExpression: EXPRESSION__TYPE_ANNOTATION,
    TSCallSignatureDeclaration: TYPE_PARAMETERS__PARAMS__RETURN_TYPE,
    TSClassImplements: EXPRESSION__TYPE_ARGUMENTS,
    TSConditionalType: freeze(['checkType', 'extendsType', 'trueType', 'falseType']),
    TSConstructSignatureDeclaration: TYPE_PARAMETERS__PARAMS__RETURN_TYPE,
    TSConstructorType: TYPE_PARAMETERS__PARAMS__RETURN_TYPE,
    TSDeclareFunction: ID__TYPE_PARAMETERS__PARAMS__RETURN_TYPE__BODY,
    TSEmptyBodyFunctionExpression: freeze(['id', 'typeParameters', 'params', 'returnType']),
    TSEnumBody: MEMBERS,
    TSEnumDeclaration: ID__BODY,
    TSEnumMember: freeze(['id', 'initializer']),
    TSExportAssignment: EXPRESSION,
    TSExternalModuleReference: EXPRESSION,
    TSFunctionType: TYPE_PARAMETERS__PARAMS__RETURN_TYPE,
    TSImportEqualsDeclaration: freeze(['id', 'moduleReference']),
    TSImportType: freeze(['source', 'options', 'qualifier', 'typeArguments']),
    TSIndexSignature: freeze(['parameters', 'typeAnnotation']),
    TSIndexedAccessType: freeze(['objectType', 'indexType']),
    TSInferType: freeze(['typeParameter']),
    TSInstantiationExpression: EXPRESSION__TYPE_ARGUMENTS,
    TSInterfaceBody: BODY,
    TSInterfaceDeclaration: freeze(['id', 'typeParameters', 'extends', 'body']),
    TSInterfaceHeritage: EXPRESSION__TYPE_ARGUMENTS,
    TSIntersectionType: TYPES,
    TSJSDocNonNullableType: TYPE_ANNOTATION,
    TSJSDocNullableType: TYPE_ANNOTATION,
    TSLiteralType: freeze(['literal']),
    TSMappedType: freeze(['key', 'constraint', 'nameType', 'typeAnnotation']),
    TSMethodSignature: freeze(['key', 'typeParameters', 'params', 'returnType']),
    TSModuleBlock: BODY,
    TSModuleDeclaration: ID__BODY,
    TSNamedTupleMember: freeze(['label', 'elementType']),
    TSNamespaceExportDeclaration: freeze(['id']),
    TSNonNullExpression: EXPRESSION,
    TSOptionalType: TYPE_ANNOTATION,
    TSParameterProperty: freeze(['decorators', 'parameter']),
    TSParenthesizedType: TYPE_ANNOTATION,
    TSPropertySignature: freeze(['key', 'typeAnnotation']),
    TSQualifiedName: LEFT__RIGHT,
    TSRestType: TYPE_ANNOTATION,
    TSSatisfiesExpression: EXPRESSION__TYPE_ANNOTATION,
    TSTemplateLiteralType: freeze(['quasis', 'types']),
    TSTupleType: freeze(['elementTypes']),
    TSTypeAliasDeclaration: freeze(['id', 'typeParameters', 'typeAnnotation']),
    TSTypeAnnotation: TYPE_ANNOTATION,
    TSTypeAssertion: freeze(['typeAnnotation', 'expression']),
    TSTypeLiteral: MEMBERS,
    TSTypeOperator: TYPE_ANNOTATION,
    TSTypeParameter: freeze(['name', 'constraint', 'default']),
    TSTypeParameterDeclaration: PARAMS,
    TSTypeParameterInstantiation: PARAMS,
    TSTypePredicate: freeze(['parameterName', 'typeAnnotation']),
    TSTypeQuery: freeze(['exprName', 'typeArguments']),
    TSTypeReference: freeze(['typeName', 'typeArguments']),
    TSUnionType: TYPES,
});

/**
 * @typedef {(node: Node) => any} Visitor
 */

/**
 * @type {'*'}
 */
export const ANY_CHILD = '*';

/**
 * Walks through the AST nodes starting from the given root node, calling the provided callback for each node. The walk can be customized with options to skip the root node or ignore certain branches of the AST.
 * @template {Visitor} T
 * @param {Node} root - The root AST node to start walking from.
 * @param {T} callback - The callback function to call for each visited node. If the callback returns a non-null value, the walk will be aborted and that value will be returned.
 * @param {{skipRoot?: boolean, ignoreBranches?: Record<string, string[] | typeof ANY_CHILD>}} options - Optional settings for the walk. `skipRoot` determines whether to call the callback on the root node, and `ignoreBranches` specifies which branches of the AST to ignore based on node type and property names.
 * @returns {ReturnType<Visitor> | void} The value returned by the callback if the walk was aborted, or undefined if the walk completed without abortion.
 */
export function walk(root, callback, options = {}) {
    const { skipRoot = false, ignoreBranches = {} } = options;
    const nil = () => {};

    /**
     * Visits the children of a given AST node, calling the callback for each child node unless the branch is specified to be ignored. If any callback call returns a non-null value, the walk will be aborted and that value will be returned.
     * @param {Node} node - The AST node whose children are to be visited.
     * @param {() => void} [parentAbort] - A function to call to abort the walk from the parent node.
     * @returns {ReturnType<T> | void} The value returned by the callback if the walk was aborted, or undefined if the walk completed without abortion.
     */
    function visitNodeChildren(node, parentAbort) {
        return iterateCallbacks(
            Object.values(visitorKeys[node.type]).map((name) => {
                if (ignoreBranches[node.type] === ANY_CHILD || ignoreBranches[node.type]?.includes(name)) {
                    return nil;
                }
                return (abort) => {
                    const child = /** @type {Node[] | Node | null | undefined} */ (
                        node[/** @type {keyof Node} */ (name)]
                    );
                    if (!child) {
                        return;
                    }
                    if (Array.isArray(child)) {
                        return visitNodes(child, () => {
                            parentAbort?.();
                            abort();
                        });
                    }

                    return visitNode(child, () => {
                        parentAbort?.();
                        abort();
                    });
                };
            })
        );
    }

    /**
     * Visits an array of AST nodes, calling the callback for each node unless the branch is specified to be ignored. If any callback call returns a non-null value, the walk will be aborted and that value will be returned.
     * @param {Node[]} nodes - The array of AST nodes to visit.
     * @param {() => void} [parentAbort] - A function to call to abort the walk from the parent node.
     * @returns {ReturnType<T> | void} The value returned by the callback if the walk was aborted, or undefined if the walk completed without abortion.
     */
    function visitNodes(nodes, parentAbort) {
        return iterateCallbacks(
            nodes.map((node) => {
                if (!node) {
                    return nil;
                }
                return (abort) =>
                    visitNode(node, () => {
                        parentAbort?.();
                        abort();
                    });
            })
        );
    }

    /**
     * Visits a single AST node, calling the callback for that node unless the root node is being skipped. If the callback call returns a non-null value, the walk will be aborted and that value will be returned. Otherwise, the function will proceed to visit the children of the node.
     * @param {Node} node - The AST node to visit.
     * @param {() => void} [parentAbort] - A function to call to abort the walk from the parent node.
     * @returns {ReturnType<T> | void} The value returned by the callback if the walk was aborted, or undefined if the walk completed without abortion.
     */
    function visitNode(node, parentAbort) {
        if (!skipRoot || node !== root) {
            const result = callback(node);
            if (result instanceof Promise) {
                return /** @type {ReturnType<T>} */ (
                    result.then((res) => {
                        if (res != null) {
                            parentAbort?.();
                            return res;
                        }

                        return visitNodeChildren(node, parentAbort);
                    })
                );
            }
            if (result != null) {
                parentAbort?.();
                return result;
            }
        }

        return visitNodeChildren(node, parentAbort);
    }
    return visitNode(root);
}
