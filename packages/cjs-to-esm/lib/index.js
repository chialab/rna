import { inlineSourcemap, transform as esTransform, walk, getOffsetFromLocation } from '@chialab/estransform';

export const REQUIRE_REGEX = /([^.\w$]|^)require\s*\((['"])(.*?)\2\)/g;
export const UMD_REGEXES = [
    /\btypeof\s+exports\s*===?\s*['|"]object['|"]/,
    /\btypeof\s+define\s*===?\s*['|"]function['|"]/,
];
export const UMD_GLOBALS = ['globalThis', 'global', 'self', 'window'];
export const UMD_GLOBALS_REGEXES = UMD_GLOBALS.map((varName) => new RegExp(`\\btypeof\\s+(${varName})\\s*!==?\\s*['|"]undefined['|"]`));
export const ESM_KEYWORDS = /((?:^\s*|;\s*)(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from|\*\s*as\s+[^\s]+\s+from)?\s*['"])|((?:^\s*|;\s*)export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{)))/m;
export const CJS_KEYWORDS = /\b(module\.exports|exports|require)\b/;
export const THIS_PARAM = /(}\s*\()this(,|\))/g;

/**
 * @type {Promise<typeof import('cjs-module-lexer')>}
 */
let initializeCjs;

/**
 * @param {string} code
 */
export async function parseCommonjs(code) {
    initializeCjs = initializeCjs || import('cjs-module-lexer')
        .then(({ init, parse }) =>
            init()
                .then(() => ({ init, parse }))
        );
    const { parse } = await initializeCjs;
    return parse(code);
}

/**
 * @type {Promise<typeof import('es-module-lexer')>}
 */
let initializeEsm;

/**
 * @param {string} code
 */
export async function parseEsm(code) {
    initializeEsm = initializeEsm || import('es-module-lexer')
        .then(({ init, parse }) =>
            init.then(() => ({ init, parse }))
        );
    const { parse } = await initializeEsm;
    return parse(code);
}

export const REQUIRE_HELPER = `// Require helper for interop
function $$cjs_default$$(requiredModule) {
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
 * Check if there is chanches that the provided code is a commonjs module.
 * @param {string} code
 */
export async function maybeCommonjsModule(code) {
    if (!CJS_KEYWORDS.test(code)) {
        return false;
    }

    const [imports, exports] = await parseEsm(code);
    return imports.length === 0 && exports.length === 0;
}

/**
 * @typedef {{ source?: string, sourcemap?: boolean|'inline', sourcesContent?: boolean, ignore?(specifier: string, options: Options): boolean|Promise<boolean> }} Options
 */

/**
 * @param {Options} options
 */
export function createTransform({ ignore = () => false }) {
    const specs = new Map();
    const ns = new Map();

    /**
     * @type {import('@chialab/estransform').TransformCallack}
     */
    const transform = async (data, options) => {
        const { magicCode, code } = data;
        const isUmd = UMD_REGEXES.every((regex) => regex.test(code));
        let insertHelper = false;
        if (!isUmd) {
            /**
             * @type {Promise<any>}
             */
            let specPromise = Promise.resolve();
            const ast = data.ast;
            walk(ast, {
                /**
                 * @param {*} node
                 */
                CallExpression(node) {
                    if (!node.callee || node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
                        return;
                    }

                    if (node.arguments.length !== 1 || node.arguments[0].type !== 'Literal') {
                        return;
                    }

                    specPromise = specPromise
                        .then(async () => {
                            const specifier = node.arguments[0].value;
                            let spec = specs.get(specifier);
                            if (!spec) {
                                let id = `$cjs$${specifier.replace(/[^\w_$]+/g, '_')}`;
                                const count = (ns.get(id) || 0) + 1;
                                ns.set(id, count);
                                if (count > 1) {
                                    id += count;
                                }

                                if (await ignore(specifier, options)) {
                                    return;
                                }

                                spec = { id, specifier };
                                specs.set(specifier, spec);
                            }

                            insertHelper = true;
                            magicCode.overwrite(
                                getOffsetFromLocation(code, node.loc.start),
                                getOffsetFromLocation(code, node.loc.end),
                                `$$cjs_default$$(${spec.id})`
                            );
                        });
                },
            });

            await specPromise;
        }

        if (isUmd) {
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
export default (__newUmdKeys.length ? __umdGlobal[__newUmdKeys[__newUmdKeys.length - 1]] : undefined);`);

            // replace the usage of `this` as global object because is not supported in esm
            let thisMatch = THIS_PARAM.exec(code);
            while (thisMatch) {
                magicCode.overwrite(thisMatch.index, thisMatch.index + thisMatch[0].length, `${thisMatch[1]}this || __umdGlobal${thisMatch[2]}`);
                thisMatch = THIS_PARAM.exec(code);
            }
        } else {
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

            const { exports, reexports } = await parseCommonjs(code);
            const named = exports.filter((entry) => entry !== '__esModule' && entry !== 'default');
            const isEsModule = exports.includes('__esModule');
            const hasDefault = exports.includes('default');
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
                if (hasDefault) {
                    magicCode.append('\nexport default (module.exports != null && typeof module.exports === \'object\' && \'default\' in module.exports ? module.exports.default : module.exports);');
                }
            } else {
                magicCode.append('\nexport default module.exports;');
            }

            reexports.forEach((reexport) => {
                magicCode.append(`\nexport * from '${reexport}';`);
            });
        }

        if (insertHelper) {
            magicCode.prepend(REQUIRE_HELPER);
        }

        specs.forEach((spec) => {
            magicCode.prepend(`import * as ${spec.id} from "${spec.specifier}";\n`);
        });
    };

    return transform;
}

/**
 * @param {string} contents
 * @param {Options} options
 * @return {Promise<import('@chialab/estransform').TransformResult>}
 */
export async function transform(contents, { source, sourcemap = true, sourcesContent = false, ignore = () => false } = {}) {
    const { code, map } = await esTransform(contents, {
        source,
        sourcesContent,
    }, createTransform({ ignore }));

    if (!sourcemap || !map) {
        return {
            code,
            map: null,
        };
    }

    if (sourcemap === 'inline' && code) {
        return {
            code: inlineSourcemap(code, map),
            map,
        };
    }

    return {
        code,
        map,
    };
}
