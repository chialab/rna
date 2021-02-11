const { existsSync } = require('fs');
const path = require('path');

function createDefaultResolver(opts) {
    return async (url, decl) => {
        if (url.indexOf('data:') === 0) {
            return null;
        }
        let importee = decl.source.input && decl.source.input.file;
        let map = decl.source.input && decl.source.input.map;
        if (!importee && !opts.root) {
            return null;
        }
        let mapImportee = map && (() => {
            let position = map.consumer().originalPositionFor(decl.source.start);
            if (position && position.source) {
                let resolved = path.resolve(opts.dest, position.source);
                if (existsSync(resolved)) {
                    return resolved;
                }
            }
        })();
        let file;
        if (importee) {
            file = path.resolve(path.dirname(importee), url.split('?')[0]);
        }
        if (opts.root && (!file || !existsSync(file))) {
            file = path.resolve(opts.root, url.split('?')[0]);
        }
        if (mapImportee && (!file || !existsSync(file))) {
            file = path.resolve(path.dirname(mapImportee), url.split('?')[0]);
        }
        if (!existsSync(file)) {
            return null;
        }
        return file;
    };
}

module.exports = function(opts = {}) {
    const resolver = opts.resolver || createDefaultResolver(opts);

    return {
        postcssPlugin: 'postcss-rewrite',
        async Once(root, { result }) {
            let promises = [];
            root.walkDecls((decl) => {
                if (decl.value && decl.value.indexOf('url(') > -1) {
                    let urls = decl.value.match(/url\(['"]?.*?['"]?\)/ig)
                        .map((entry) => entry.replace(/^url\(['"]?/i, '').replace(/['"]?\)$/i, ''))
                        .filter(Boolean);
                    let importee = decl.source.input && decl.source.input.file;
                    if (!importee && !opts.root) {
                        return;
                    }
                    promises.push(
                        ...urls.map(async (url) => {
                            let file = await resolver(url, decl);
                            let replace;
                            if (!file) {
                                result.missingFiles = result.missingFiles || [];
                                result.missingFiles.push(file);
                            } else {
                                replace = file;
                                if (replace) {
                                    result.files = result.files || [];
                                    if (result.files.indexOf(replace) === -1) {
                                        result.files.push(replace);
                                    }
                                }
                            }
                            return {
                                url,
                                replace,
                                decl,
                            };
                        })
                    );
                }
            });

            let replacements = await Promise.all(promises);
            replacements.forEach((info) => {
                let { decl, url, replace } = info;
                if (replace) {
                    decl.value = decl.value.replace(`(${url})`, `(${replace})`);
                }
            });
        },
    };
};
