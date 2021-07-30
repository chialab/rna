import { init, parse } from 'cjs-module-lexer';
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

    if (typeof specifiers !== 'object' || hasNamedExports) {
        return specifiers;
    }

    if (hasDefaultExport) {
        return specifiers.default;
    }

    return specifiers;
}`;

/**
 * Check if there is chanches that the provided code is a commonjs module.
 * @param {string} code
 */
export function maybeCommonjsModule(code) {
    return !ESM_KEYWORDS.test(code) && CJS_KEYWORDS.test(code);
}

/**
 * @typedef {{ source?: string, sourcemap?: boolean|'inline', sourcesContent?: boolean, ignore?(specifier: string): boolean|Promise<boolean> }} Options
 */

/**
 * @param {Options} options
 */
export function createTransform({ ignore = () => false }) {
    const specs = new Map();
    const ns = new Map();

    /**
     * @type {Promise<void>}
     */
    let initialize;

    /**
     * @type {import('@chialab/estransform').TransformCallack}
     */
    const transform = async (data) => {
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

                                if (await ignore(specifier)) {
                                    return;
                                }

                                spec = { id, specifier };
                                specs.set(specifier, spec);
                            }

                            insertHelper = true;
                            magicCode.overwrite(
                                getOffsetFromLocation(code, node.loc.start.line, node.loc.start.column),
                                getOffsetFromLocation(code, node.loc.end.line, node.loc.end.column),
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

            let varName = '';
            UMD_GLOBALS.forEach((name, index) => {
                const regex = UMD_GLOBALS_REGEXES[index];
                const match = code.match(regex);
                if (match && match.index != null && match.index < endDefinition) {
                    if (varName) {
                        magicCode.overwrite(match.index, match.index + match[0].length, 'false');
                    } else {
                        varName = name;
                    }
                }
            });
            magicCode.prepend(`var __umd = {}; (function(${varName || '_'}) {\n`);
            magicCode.append('\n }).call(__umd, __umd);');
            magicCode.append('\nvar __umdKeys = Object.keys(__umd);');
            magicCode.append('\nvar __umdExport = __umdKeys.length === 1 ? __umdKeys[0] : false;');
            magicCode.append('\nif (__umdExport && typeof window !== \'undefined\') window[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nif (__umdExport && typeof self !== \'undefined\') self[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nif (__umdExport && typeof global !== \'undefined\') global[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nif (__umdExport && typeof globalThis !== \'undefined\') globalThis[__umdExport] = __umd[__umdExport];');
            magicCode.append('\nexport default (__umdExport ? __umd[__umdExport] : __umd);');
        } else {
            magicCode.prepend('var global = globalThis; var module = { exports: {} }, exports = module.exports;\n');
            initialize = initialize || init();
            await initialize;
            /**
             * This is very ugly, but there are a lot of React stuff out there
             * @type {{ [key: string]: string }}
             */
            const replacements = process.env.NODE_ENV === 'production' ? {
                './cjs/react.development.js': './cjs/react.production.min.js',
                './cjs/react-dom.development.js': './cjs/react-dom.production.min.js',
            } : {};
            const { exports, reexports } = parse(code);
            const named = exports.filter((entry) => entry !== '__esModule' && entry !== 'default');
            const isEsModule = exports.includes('__esModule');
            const hasDefault = exports.includes('default');
            if (named.length) {
                const conditions = ['typeof module.exports === \'object\''];
                if (named.length === 1 && !hasDefault && !isEsModule) {
                    // add an extra conditions for some edge cases not handled by the cjs lexer
                    // such as an object exports that has a function as first member.
                    conditions.push(`typeof module.exports['${named[0]}'] !== 'function'`);
                }
                named.forEach((name, index) => {
                    magicCode.append(`\nconst __export${index} = ${conditions.join(' && ')} ? module.exports['${name}'] : undefined;`);
                });
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
                for (const key in replacements) {
                    if (reexport === key) {
                        const spec = specs.get(reexport);
                        reexport = replacements[key];
                        if (spec) {
                            spec.specifier = reexport;
                        }
                    }
                }
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
