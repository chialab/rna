import { MagicString, parse, walk, parseCommonjs, parseEsm, getSpanLocation, createEmptySourcemapComment } from '@chialab/estransform';

export const REQUIRE_REGEX = /([^.\w$]|^)require\s*\((['"])(.*?)\2\)/g;
export const UMD_REGEXES = [
    /\btypeof\s+(?:module\.)?exports\s*===?\s*['|"]object['|"]/,
    /\btypeof\s+define\s*===?\s*['|"]function['|"]/,
];
export const UMD_GLOBALS = ['globalThis', 'global', 'self', 'window'];
export const UMD_GLOBALS_REGEXES = UMD_GLOBALS.map((varName) => new RegExp(`\\btypeof\\s+(${varName})\\s*!==?\\s*['|"]undefined['|"]`));
export const ESM_KEYWORDS = /((?:^\s*|;\s*)(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from|\*\s*as\s+[^\s]+\s+from)?\s*['"])|((?:^\s*|;\s*)export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{)))/m;
export const EXPORTS_KEYWORDS = /\b(module\.exports\b|exports\b)/;
export const CJS_KEYWORDS = /\b(module\.exports\b|exports\b|require[.(])/;
export const THIS_PARAM = /(}\s*\()this(,|\))/g;

export const REQUIRE_FUNCTION = '$$cjs_default$$';

export const HELPER_MODULE = '$$cjs_helper$$.js';

export const REQUIRE_HELPER = `function ${REQUIRE_FUNCTION}(requiredModule) {
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
        return (imports.length !== 0 || exports.length !== 0);
    } catch(err) {
        //
    }

    return false;
}

/**
 * Check if an expression is a require call.
 * @param {import('@chialab/estransform').CallExpression} node
 */
function isRequireCallExpression(node) {
    return node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.value === 'require';
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
 * @param {TransformOptions} [options]
 */
export async function transform(code, { sourcemap = true, source, sourcesContent = false, ignore = () => false, helperModule = false, ignoreTryCatch = true } = {}) {
    if (await maybeMixedModule(code)) {
        throw new Error('Cannot convert mixed modules');
    }

    const specs = new Map();
    const ns = new Map();
    const isUmd = UMD_REGEXES.every((regex) => regex.test(code));
    const magicCode = new MagicString(code);

    let insertHelper = false;
    if (!isUmd) {
        /**
         * @type {Promise<any>}
         */
        let specPromise = Promise.resolve();

        /**
         * @type {*[]}
         */
        const ignoredExpressions = [];
        const ast = await parse(code);

        if (ignoreTryCatch) {
            walk(ast, {
                /**
                 * @param {import('@chialab/estransform').TryStatement} node
                 */
                TryStatement(node) {
                    walk(node, {
                        /**
                         * @param {import('@chialab/estransform').CallExpression} node
                         */
                        CallExpression(node) {
                            if (isRequireCallExpression(node)) {
                                ignoredExpressions.push(node);
                            }
                        },
                    });
                },
            });
        }

        walk(ast, {
            /**
             * @param {import('@chialab/estransform').CallExpression} node
             */
            CallExpression(node) {
                if (!isRequireCallExpression(node) || ignoredExpressions.includes(node)) {
                    return;
                }

                if (node.arguments.length !== 1) {
                    return;
                }

                const firstArg = node.arguments[0].expression;
                if (firstArg.type !== 'StringLiteral') {
                    return;
                }

                specPromise = specPromise
                    .then(async () => {
                        const specifier = firstArg.value;
                        let spec = specs.get(specifier);
                        if (!spec) {
                            let id = `$cjs$${specifier.replace(/[^\w_$]+/g, '_')}`;
                            const count = (ns.get(id) || 0) + 1;
                            ns.set(id, count);
                            if (count > 1) {
                                id += count;
                            }

                            if (await ignore(specifier)) {
                                return;
                            }

                            spec = { id, specifier };
                            specs.set(specifier, spec);
                        }

                        insertHelper = true;

                        const loc = getSpanLocation(ast, node);
                        magicCode.overwrite(loc.start, loc.end, `${REQUIRE_FUNCTION}(typeof ${spec.id} !== 'undefined' ? ${spec.id} : {})`);
                    });
            },
        });

        await specPromise;
    }

    const { exports, reexports } = await parseCommonjs(code);
    const named = exports.filter((entry) => entry !== '__esModule' && entry !== 'default');
    const isEsModule = exports.includes('__esModule');
    const hasDefault = exports.includes('default');

    if (isUmd && !isEsModule) {
        let endDefinition = code.indexOf('\'use strict\';');
        if (endDefinition === -1) {
            endDefinition = code.indexOf('"use strict";');
        }
        if (endDefinition === -1) {
            endDefinition = code.length;
        }

        magicCode.prepend(`var __umdGlobal = (
    (typeof window !== 'undefined' && window) ||
    (typeof self !== 'undefined' && self) ||
    (typeof global !== 'undefined' && global) ||
    (typeof globalThis !== 'undefined' && globalThis) ||
    {}
);
var __umdKeys = Object.keys(__umdGlobal);
(function(window, global, globalThis, self, module, exports) {
`);
        magicCode.append(`
}).call(__umdGlobal, __umdGlobal, __umdGlobal, __umdGlobal, __umdGlobal, undefined, undefined);

var __newUmdKeys = Object.keys(__umdGlobal).slice(__umdKeys.length);
export default (__newUmdKeys.length ? __umdGlobal[__newUmdKeys[0]] : undefined);`);

        // replace the usage of `this` as global object because is not supported in esm
        let thisMatch = THIS_PARAM.exec(code);
        while (thisMatch) {
            magicCode.overwrite(thisMatch.index, thisMatch.index + thisMatch[0].length, `${thisMatch[1]}this || __umdGlobal${thisMatch[2]}`);
            thisMatch = THIS_PARAM.exec(code);
        }
    } else if (exports.length > 0 || reexports.length > 0) {
        magicCode.prepend(`var global = globalThis;
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
            if (named.length === 1 && !hasDefault && !isEsModule) {
                // add an extra conditions for some edge cases not handled by the cjs lexer
                // such as an object exports that has a function as first member.
                conditions.push(`typeof module.exports['${named[0]}'] !== 'function'`);
            }

            magicCode.append(`\nvar ${named.map((name, index) => `__export${index}`).join(', ')};
if (${conditions.join(' && ')}) {
    ${named.map((name, index) => `__export${index} = module.exports['${name}'];`).join('\n    ')}
}`);

            magicCode.append(`\nexport { ${named.map((name, index) => `__export${index} as ${name}`).join(', ')} }`);
        }
        if (isEsModule) {
            if (hasDefault || named.length === 0) {
                magicCode.append('\nexport default (module.exports != null && typeof module.exports === \'object\' && \'default\' in module.exports ? module.exports.default : module.exports);');
            }
        } else {
            magicCode.append('\nexport default module.exports;');
        }

        reexports.forEach((reexport) => {
            magicCode.append(`\nexport * from '${reexport}';`);
        });
    } else if (EXPORTS_KEYWORDS.test(code)) {
        magicCode.prepend(`var global = globalThis;
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
        magicCode.append('\nexport default module.exports;');
    }

    if (insertHelper) {
        if (helperModule) {
            magicCode.prepend(`import ${REQUIRE_FUNCTION} from './${HELPER_MODULE}';\n`);
        } else {
            magicCode.prepend(`// Require helper for interop\n${REQUIRE_HELPER}`);
        }
    }

    specs.forEach((spec) => {
        magicCode.prepend(`import * as ${spec.id} from "${spec.specifier}";\n`);
    });

    return {
        code: magicCode.toString(),
        map: sourcemap ? magicCode.generateMap({
            source,
            includeContent: sourcesContent,
            hires: true,
        }) : null,
    };
}

/**
 * Wrap with a try catch block any require call.
 * @param {string} code
 * @param {{ sourcemap?: boolean, source?: string; sourcesContent?: boolean }} options
 */
export async function wrapDynamicRequire(code, { sourcemap = true, source, sourcesContent = false } = {}) {
    /**
     * @type {MagicString|undefined}
     */
    let magicCode;

    const ast = await parse(code);
    walk(ast, {
        /**
         * @param {import('@chialab/estransform').IfStatement} node
         */
        IfStatement(node) {
            if (node.test.type !== 'BinaryExpression' ||
                node.test.left.type !== 'UnaryExpression' ||
                node.test.left.operator !== 'typeof' ||
                node.test.left.argument.type !== 'Identifier' ||
                node.test.left.argument.value !== 'require' ||
                !node.test.operator.startsWith('==') ||
                node.test.right.type !== 'StringLiteral' ||
                node.test.right.value !== 'function') {
                return;
            }

            magicCode = magicCode || new MagicString(code);

            const loc = getSpanLocation(ast, node);
            magicCode.prependLeft(loc.start, 'try {');
            magicCode.appendRight(loc.end, '} catch(err) {}');
        },
    });

    if (!magicCode) {
        return;
    }

    return {
        code: magicCode.toString(),
        map: sourcemap ? magicCode.generateMap({
            source,
            includeContent: sourcesContent,
            hires: true,
        }) : null,
    };
}
