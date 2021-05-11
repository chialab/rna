import MagicString from 'magic-string';

const COMMENTS_REGEX = /\/\*[\s\S]*?\*\//g;
export const REQUIRE_REGEX = /([^.\w$]|^)require\s*\((['"])(.*?)\2\)/g;
export const UMD_REGEXES = [
    /\btypeof\s+exports\s*===?\s*['|"]object['|"]/,
    /\btypeof\s+define\s*===?\s*['|"]function['|"]/,
    /\btypeof\s+window\s*!==?\s*['|"]undefined['|"]/,
];
export const ESM_KEYWORDS = /((?:^\s*|;\s*)(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from|\*\s*as\s+[^\s]+\s+from)?\s*['"])|((?:^\s*|;\s*)export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{)))/m;
export const CJS_KEYWORDS = /\b(module\.exports|exports|require)\b/;

/**
 * @param {string} contents
 * @param {{ source?: string, sourceMap?: boolean|'inline'|'both', ignore?(specifier: string): boolean }} options
 * @return {{ code: string, map?: SourceMap }}
 */
export function transform(contents, { source, sourceMap = true, ignore = () => false } = {}) {
    const specs = new Map();
    const ns = new Map();
    const magicCode = new MagicString(contents);

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
            let [str, before, quote, specifier] = match;
            let spec = specs.get(specifier);
            if (!spec) {
                let id = `$cjs$${specifier.replace(/[^\w_$]+/g, '_')}`;
                let count = (ns.get(id) || 0) + 1;
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
        magicCode.prepend('var __umd = {}; (function(window) {\n');
        magicCode.append('\n })(__umd);');
        magicCode.append('\nvar __umdExport = Object.keys(__umd)[0];');
        magicCode.append('\nif (typeof window !== \'undefined\') window[__umdExport] = __umd[__umdExport];');
        magicCode.append('\nif (typeof self !== \'undefined\') self[__umdExport] = __umd[__umdExport];');
        magicCode.append('\nif (typeof global !== \'undefined\') global[__umdExport] = __umd[__umdExport];');
        magicCode.append('\nif (typeof globalThis !== \'undefined\') globalThis[__umdExport] = __umd[__umdExport];');
        magicCode.append('\nexport default __umd[__umdExport]');
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

    let code = magicCode.toString();
    if (!sourceMap) {
        return { code };
    }

    const map = magicCode.generateMap({
        source,
        hires: true,
        includeContent: true,
    });

    if (sourceMap === 'inline') {
        code += `\n//# sourceMappingURL=${map.toUrl()}`;
        return { code };
    }

    if (sourceMap === 'both') {
        code += `\n//# sourceMappingURL=${map.toUrl()}`;
    }

    return { code, map: JSON.parse(map.toString()) };
}
