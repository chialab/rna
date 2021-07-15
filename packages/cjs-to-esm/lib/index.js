import { inlineSourcemap, transform as esTransform } from '@chialab/estransform';

const COMMENTS_REGEX = /\/\*[\s\S]*?\*\//g;
export const REQUIRE_REGEX = /([^.\w$]|^)require\s*\((['"])(.*?)\2\)/g;
export const UMD_REGEXES = [
    /\btypeof\s+exports\s*===?\s*['|"]object['|"]/,
    /\btypeof\s+define\s*===?\s*['|"]function['|"]/,
];
export const UMD_GLOBALS = ['globalThis', 'global', 'self', 'window'];
export const UMD_GLOBALS_REGEXES = UMD_GLOBALS.map((varName) => new RegExp(`\\btypeof\\s+(${varName})\\s*!==?\\s*['|"]undefined['|"]`));
export const ESM_KEYWORDS = /((?:^\s*|;\s*)(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from|\*\s*as\s+[^\s]+\s+from)?\s*['"])|((?:^\s*|;\s*)export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{)))/m;
export const CJS_KEYWORDS = /\b(module\.exports|exports|require)\b/;

/**
 * @typedef {{ source?: string, sourcemap?: boolean|'inline', sourcesContent?: boolean, ignore?(specifier: string): boolean }} Options
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
    const transform = (magicCode, contents) => {
        let match = COMMENTS_REGEX.exec(contents);
        while (match) {
            magicCode.overwrite(match.index, match.index + match[0].length, '');
            match = COMMENTS_REGEX.exec(contents);
        }

        const isUmd = UMD_REGEXES.every((regex) => regex.test(contents));
        let insertHelper = false;
        if (!isUmd) {
            match = REQUIRE_REGEX.exec(contents);
            while (match) {
                const [str, before, quote, specifier] = match;
                let spec = specs.get(specifier);
                if (!spec) {
                    let id = `$cjs$${specifier.replace(/[^\w_$]+/g, '_')}`;
                    const count = (ns.get(id) || 0) + 1;
                    ns.set(id, count);
                    if (count > 1) {
                        id += count;
                    }
                    if (ignore(specifier)) {
                        match = REQUIRE_REGEX.exec(contents);
                        continue;
                    }
                    spec = { id, specifier: quote + specifier + quote };
                    specs.set(specifier, spec);
                }

                insertHelper = true;
                magicCode.overwrite(
                    match.index,
                    match.index + str.length,
                    `${before}$$cjs_default$$(${spec.id})`
                );
                match = REQUIRE_REGEX.exec(contents);
            }
        }

        if (isUmd) {
            let endDefinition = contents.indexOf('\'use strict\';');
            if (endDefinition === -1) {
                endDefinition = contents.indexOf('"use strict";');
            }
            if (endDefinition === -1) {
                endDefinition = contents.length;
            }

            let varName = '';
            UMD_GLOBALS.forEach((name, index) => {
                const regex = UMD_GLOBALS_REGEXES[index];
                const match = contents.match(regex);
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
            magicCode.prepend('var module = { exports: {} }, exports = module.exports;\n');
            magicCode.append('\nexport default ((typeof module.exports === \'object\' && \'default\' in module.exports) ? module.exports.default : module.exports);');
        }

        if (insertHelper) {
            magicCode.prepend('function $$cjs_default$$(m, i) { for (i in m) if (i != \'default\') return m; if (typeof m == \'object\' && \'default\' in m) return m.default; return m; }\n');
        }

        specs.forEach(spec => {
            magicCode.prepend(`import * as ${spec.id} from ${spec.specifier};\n`);
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

    if (sourcemap === 'inline') {
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
