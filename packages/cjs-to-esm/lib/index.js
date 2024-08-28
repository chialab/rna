import { createEmptySourcemapComment, parse, parseCommonjs, parseEsm, walk } from '@chialab/estransform';

export const REQUIRE_REGEX = /([^.\w$]|^)require\s*\((['"])(.*?)\2\)/g;
export const UMD_REGEXES = [
    /\btypeof\s+(module\.exports|module|exports)\s*===?\s*['|"]object['|"]/,
    /['|"]object['|"]\s*===?\s*typeof\s+(module\.exports|module|exports)/,
    /\btypeof\s+define\s*===?\s*['|"]function['|"]/,
    /['|"]function['|"]\s*===?\s*typeof\s+define/,
];
export const UMD_GLOBALS = ['globalThis', 'global', 'self', 'window'];
export const ESM_KEYWORDS =
    /((?:^\s*|;\s*)(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from|\*\s*as\s+[^\s]+\s+from)?\s*['"])|((?:^\s*|;\s*)export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{)))/m;
export const EXPORTS_KEYWORDS = /\b(module\.exports\b|exports\b)/;
export const CJS_KEYWORDS = /\b(module\.exports\b|exports\b|require[.(])/;

export const REQUIRE_FUNCTION = '__cjs_default__';
export const HELPER_MODULE = '__cjs_helper__.js';

export const GLOBAL_HELPER = `((typeof window !== 'undefined' && window) ||
(typeof self !== 'undefined' && self) ||
(typeof global !== 'undefined' && global) ||
(typeof globalThis !== 'undefined' && globalThis) ||
{})`;

export const REQUIRE_HELPER = `function ${REQUIRE_FUNCTION}(requiredModule) {
    var Object = ${GLOBAL_HELPER}.Object;
    var isEsModule = false;
    var specifiers = Object.create(null);
    var hasNamedExports = false;
    var hasDefaultExport = false;

    Object.defineProperty(specifiers, '__esModule', {
        value: true,
        enumerable: false,
        configurable: true,
    });

    if (requiredModule) {
        var names = Object.getOwnPropertyNames(requiredModule);;
        names.forEach(function(k) {
            if (k === 'default') {
                hasDefaultExport = true;
            } else if (!hasNamedExports && k != '__esModule') {
                try {
                    hasNamedExports = requiredModule[k] != null;
                } catch (err) {
                    //
                }
            }
            Object.defineProperty(specifiers, k, {
                get: function () {
                    return requiredModule[k];
                },
                enumerable: true,
                configurable: false,
            });
        });
        if (Object.getOwnPropertySymbols) {
            var symbols = Object.getOwnPropertySymbols(requiredModule);
            symbols.forEach(function(k) {
                Object.defineProperty(specifiers, k, {
                    get: function () {
                        return requiredModule[k];
                    },
                    enumerable: false,
                    configurable: false,
                });
            });
        }

        Object.preventExtensions(specifiers);
        Object.seal(specifiers);
        if (Object.freeze) {
            Object.freeze(specifiers);
        }
    }

    if (hasNamedExports) {
        return specifiers;
    }

    if (hasDefaultExport) {
        if (Object.isExtensible(specifiers.default) && !('default' in specifiers.default)) {
            Object.defineProperty(specifiers.default, 'default', {
                value: specifiers.default,
                configurable: false,
                enumerable: false,
            })
        }
        return specifiers.default;
    }

    return specifiers;
}
`;

/**
 * Create an ESM module that exports the helper with an empty sourcemap.
 */
export function createRequireHelperModule() {
    return `export default ${REQUIRE_HELPER};\n${createEmptySourcemapComment()}`;
}

/**
 * Check if there are chanches that the provided code is a commonjs module.
 * @param {string} code
 */
export async function maybeCommonjsModule(code) {
    if (!CJS_KEYWORDS.test(code)) {
        return false;
    }

    try {
        const [imports, exports] = await parseEsm(code);
        if (imports.length !== 0 || exports.length !== 0) {
            return false;
        }
    } catch (err) {
        return false;
    }

    // es-module-parse seems to not detect deconstructed exports
    if (code.match(/\bexport\s+const\s*{/)) {
        return false;
    }

    return true;
}

/**
 * Check if there are chanches that the provided code is both a esm and commonjs module.
 * @param {string} code
 */
export async function maybeMixedModule(code) {
    if (!CJS_KEYWORDS.test(code)) {
        return false;
    }

    try {
        const [imports, exports] = await parseEsm(code);
        return imports.length !== 0 || exports.length !== 0;
    } catch (err) {
        //
    }

    return false;
}

/**
 * @typedef {(specifier: string) => boolean|Promise<boolean>} IgnoreCallback
 */

/**
 * @typedef {Object} TransformOptions
 * @property {boolean} [sourcemap]
 * @property {string} [source]
 * @property {boolean} [sourcesContent]
 * @property {IgnoreCallback} [ignore]
 * @property {boolean} [helperModule]
 * @property {boolean} [ignoreTryCatch]
 */

/**
 * @param {string} code
 * @param {TransformOptions|undefined} options
 */
export async function transform(
    code,
    {
        sourcemap = true,
        source,
        sourcesContent = false,
        ignore = () => false,
        helperModule = false,
        ignoreTryCatch = true,
    } = {}
) {
    if (await maybeMixedModule(code)) {
        throw new Error('Cannot convert mixed modules');
    }

    const specs = new Map();
    const ns = new Map();
    const { ast, helpers } = await parse(code, source);
    const isUmd = UMD_REGEXES.some((regex) => regex.test(code));

    let insertHelper = false;
    if (!isUmd) {
        /**
         * @type {import('@chialab/estransform').Node[]}
         */
        const ignoredExpressions = [];

        if (ignoreTryCatch) {
            walk(ast, {
                TryStatement(node) {
                    walk(node.block, {
                        CallExpression(node) {
                            if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
                                return;
                            }
                            ignoredExpressions.push(node);
                        },
                    });
                },
            });
        }

        /**
         * @type {import('@chialab/estransform').Node[]}
         */
        const callExpressions = [];
        walk(ast, {
            CallExpression(node) {
                if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
                    return;
                }

                if (ignoredExpressions.includes(node)) {
                    return;
                }

                const specifier = node.arguments[0];
                if (specifier.type === 'StringLiteral') {
                    callExpressions.push(node);
                }
            },
        });

        await Promise.all(
            callExpressions.map(async (callExp) => {
                const specifier = callExp.arguments[0];
                let spec = specs.get(specifier.value);
                if (!spec) {
                    let id = `$cjs$${specifier.value.replace(/[^\w_$]+/g, '_')}`;
                    const count = (ns.get(id) || 0) + 1;
                    ns.set(id, count);
                    if (count > 1) {
                        id += count;
                    }
                    if (await ignore(specifier.value)) {
                        return;
                    }
                    spec = { id, specifier: specifier.value };
                    specs.set(specifier, spec);
                }

                insertHelper = true;
                helpers.overwrite(callExp.callee.start, callExp.callee.end, REQUIRE_FUNCTION);
                helpers.overwrite(
                    specifier.start,
                    specifier.end,
                    `typeof ${spec.id} !== 'undefined' ? ${spec.id} : {}`
                );
            })
        );
    }

    const { exports, reexports } = await parseCommonjs(code);
    const named = exports.filter((entry) => entry !== '__esModule' && entry !== 'default');
    const isEsModule = exports.includes('__esModule');
    const hasDefault = exports.includes('default');

    if (isUmd) {
        let endDefinition = code.indexOf("'use strict';");
        if (endDefinition === -1) {
            endDefinition = code.indexOf('"use strict";');
        }
        if (endDefinition === -1) {
            endDefinition = code.length;
        }

        helpers.prepend(`var __umdGlobal = ${GLOBAL_HELPER};
var __umdExports = [];
var __umdRoot = new Proxy(__umdGlobal, {
    get: function(target, name) {
        var value = Reflect.get(target, name);
        if (__umdExports.indexOf(name) !== -1) {
            return value;
        }
        if (typeof value === 'function' && !value.prototype) {
            return value.bind(__umdGlobal);
        }
        return value;
    },
    set: function(target, name, value) {
        __umdExports.push(name);
        return Reflect.set(target, name, value);
    },
});
var __umdFunction = function ProxyFunction(code) {
    return __umdGlobal.Function(code).bind(__umdRoot);
};
__umdFunction.prototype = Function.prototype;
(function(window, global, globalThis, self, module, exports, Function) {
`);
        helpers.append(`
}).call(__umdRoot, __umdRoot, __umdRoot, __umdRoot, __umdRoot, undefined, undefined, __umdFunction);

export default (__umdExports.length !== 1 && __umdRoot[__umdExports[0]] !== __umdRoot[__umdExports[1]] ? __umdRoot : __umdRoot[__umdExports[0]]);`);
    } else if (exports.length > 0 || reexports.length > 0) {
        helpers.prepend(`var global = ${GLOBAL_HELPER};
var exports = {};
var module = {
    get exports() {
        return exports;
    },
    set exports(value) {
        exports = value;
    },
};
`);

        if (named.length) {
            const conditions = ['Object.isExtensible(module.exports)'];
            if (!hasDefault && !isEsModule) {
                // add an extra conditions for some edge cases not handled by the cjs lexer
                // such as an object exports that has a function as first member.
                conditions.push(`Object.keys(module.exports).length === ${named.length}`);
            }

            helpers.append(`\nvar ${named.map((name, index) => `__export${index}`).join(', ')};
if (${conditions.join(' && ')}) {
    ${named.map((name, index) => `__export${index} = module.exports['${name}'];`).join('\n    ')}
}`);

            helpers.append(`\nexport { ${named.map((name, index) => `__export${index} as "${name}"`).join(', ')} }`);
        }
        if (isEsModule) {
            if (!isUmd && (hasDefault || named.length === 0)) {
                helpers.append(
                    "\nexport default (module.exports != null && typeof module.exports === 'object' && 'default' in module.exports ? module.exports.default : module.exports);"
                );
            }
        } else {
            helpers.append('\nexport default module.exports;');
        }

        reexports.forEach((reexport) => {
            helpers.append(`\nexport * from '${reexport}';`);
        });
    } else if (EXPORTS_KEYWORDS.test(code)) {
        helpers.prepend(`var global = ${GLOBAL_HELPER};
var exports = {};
var module = {
    get exports() {
        return exports;
    },
    set exports(value) {
        exports = value;
    },
};
`);
        helpers.append('\nexport default module.exports;');
    }

    if (insertHelper) {
        if (helperModule) {
            helpers.prepend(`import ${REQUIRE_FUNCTION} from './${HELPER_MODULE}';\n`);
        } else {
            helpers.prepend(`// Require helper for interop\n${REQUIRE_HELPER}`);
        }
    }

    specs.forEach((spec) => {
        helpers.prepend(`import * as ${spec.id} from "${spec.specifier}";\n`);
    });

    if (!helpers.isDirty()) {
        return;
    }

    return helpers.generate({
        sourcemap,
        sourcesContent,
    });
}

/**
 * Wrap with a try catch block any require call.
 * @param {string} code
 * @param {{ sourcemap?: boolean, source?: string; sourcesContent?: boolean }} options
 */
export async function wrapDynamicRequire(code, { sourcemap = true, source, sourcesContent = false } = {}) {
    const { ast, helpers } = await parse(code, source);
    walk(ast, {
        IfStatement(node) {
            if (node.test.type !== 'BinaryExpression') {
                return;
            }
            if (node.test.left.type !== 'UnaryExpression') {
                return;
            }
            if (node.test.left.operator !== 'typeof') {
                return;
            }
            if (node.test.left.argument.type !== 'Identifier') {
                return;
            }
            if (node.test.left.argument.name !== 'require') {
                return;
            }
            if (!['===', '==', '!==', '!='].includes(node.test.operator)) {
                return;
            }

            if (node.consequent.type === 'BlockStatement') {
                helpers.prepend('(() => { try { return (() => {', node.consequent.body[0].start);
                helpers.append(
                    '})(); } catch(err) {} })();',
                    node.consequent.body[node.consequent.body.length - 1].end
                );
            } else {
                helpers.prepend('(() => { try { return (() => {', node.consequent.start);
                helpers.append('})(); } catch(err) {} })();', node.consequent.end);
            }
        },
    });

    if (!helpers.isDirty()) {
        return;
    }

    return helpers.generate({
        sourcemap,
        sourcesContent,
    });
}
