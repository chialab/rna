const { Parser } = require('acorn');
const PluginParser = Parser.extend(
    require('acorn-jsx')(),
    require('acorn-bigint')
);

module.exports = function parse(code) {
    return PluginParser.parse(code, {
        sourceType: 'module',
        ecmaVersion: '2021',
    });
};
