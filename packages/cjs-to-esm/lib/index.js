import MagicString from 'magic-string';

export const REQUIRE_REGEX = /([^.\w$])require\s*\((['"])(.*?)\2\)/g;
export const ESM_KEYWORDS = /(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from)?\s*['"]|[\s;]export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{))/;
export const CJS_KEYWORDS = /\b(module\.exports|exports|require)\b/;

/**
 * @param {string} contents
 * @param {{ source?: string, sourceMap?: boolean|'inline' }} options
 * @return {{ code: string, map?: SourceMap }}
 */
export function transform(contents, { source, sourceMap = true } = {}) {
    const specs = new Map();
    const ns = new Map();
    const magicCode = new MagicString(contents);

    let insertHelper = false;
    let match = REQUIRE_REGEX.exec(contents);
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

    magicCode.prepend('var module = { exports: {} }, exports = module.exports;\n');
    magicCode.append('\nexport default module.exports;');

    if (insertHelper) {
        magicCode.prepend('function $$cjs_default$$(m,i){for(i in m)if(i!=\'default\')return m;return m.default||m}\n');
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
    }

    return { code, map: JSON.parse(map.toString()) };
}
