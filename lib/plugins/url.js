const { promises: { readFile } } = require('fs');
const { simple: walk } = require('acorn-walk');
const MagicString = require('magic-string');
const parse = require('../parse');

module.exports = function() {
    return {
        name: 'url',
        setup(build) {
            build.onResolve({ filter: /^https?:\/\// }, args => ({ path: args.path, external: true }));

            build.onLoad({ filter: /\./, namespace: 'file' }, async ({ path }) => {
                if (path.match(/\.(mjs|js|jsx|ts|tsx|json|geojson|css)$/)) {
                    return;
                }

                return {
                    contents: await readFile(path),
                    loader: 'file',
                };
            });

            build.onLoad({ filter: /\.(mjs|js|jsx|ts|tsx)$/, namespace: 'file' }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                if (!/new\s+(window\.|self\.|globalThis\.)?URL\s*\(['"]/.test(contents)) {
                    return { contents };
                }

                let ast = parse(contents);
                let urlNodes = [];

                walk(ast, {
                    MemberExpression(node) {
                        if (node.property.name !== 'href') {
                            return;
                        }
                        if (node.object.type !== 'NewExpression') {
                            return;
                        }
                        let expression = node.object;
                        let callee = expression.callee;
                        if (callee.type === 'MemberExpression') {
                            if (callee.object.name !== 'window' &&
                                callee.object.name !== 'self' &&
                                callee.object.name !== 'globalThis') {
                                return;
                            }
                            callee = callee.property;
                        }
                        if (callee.type !== 'Identifier' || callee.name !== 'URL') {
                            return;
                        }
                        if (expression.arguments.length != 2) {
                            return;
                        }
                        if (typeof expression.arguments[0].value !== 'string') {
                            return;
                        }
                        if (expression.arguments[1].type !== 'MemberExpression') {
                            return;
                        }
                        if (expression.arguments[1].object.type !== 'MetaProperty') {
                            return;
                        }
                        if (expression.arguments[1].object.property.name !== 'meta') {
                            return;
                        }
                        if (expression.arguments[1].property.name !== 'url') {
                            return;
                        }
                        urlNodes.push(node);
                    },
                });

                if (urlNodes.length === 0) {
                    return;
                }

                let magicCode = new MagicString(contents);
                await Promise.all(
                    urlNodes.map(async (node) => {
                        let value = node.object.arguments[0].value;
                        if (value[0] !== '.' && value[0] !== '/') {
                            value = `./${value}`;
                        }
                        let identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                        magicCode.prepend(`import ${identifier} from '${value}';`);
                        magicCode.overwrite(node.start, node.end, identifier);
                    })
                );

                let magicMap = magicCode.generateMap({ hires: true });
                let magicUrl = `data:application/json;charset=utf-8;base64,${Buffer.from(magicMap.toString()).toString('base64')}`;

                return {
                    contents: `${magicCode.toString()}//# sourceMappingURL=${magicUrl}`,
                };
            });
        },
    };
};
