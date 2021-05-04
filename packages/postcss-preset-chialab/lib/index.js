import autoprefixer from 'autoprefixer';
import unset from 'postcss-all-unset';
import customProperties from 'postcss-custom-properties';
import focusVisible from 'postcss-focus-visible';
import focusWithin from 'postcss-focus-within';

/**
 * Create the postcss preset used by Chialab.
 * @return {import('postcss').Plugin}
 */
export default function preset() {
    return {
        postcssPlugin: 'preset-chialab',
        prepare(result) {
            const plugins = [
                autoprefixer({
                    overrideBrowserslist: 'ie 11, chrome 30',
                    grid: true,
                    flexbox: true,
                    remove: false,
                }),
                customProperties({
                    preserve: true,
                }),
                unset(),
                focusVisible(),
                focusWithin({
                    replaceWith: '.focus-within',
                }),
            ];
            let visitors = [
                ...plugins.map((plugin) => typeof plugin === 'function' && plugin(result.root)).filter(Boolean),
                ...plugins.map((plugin) => plugin.prepare && plugin.prepare(result)).filter(Boolean),
            ];
            return {
                Once(node, result) {
                    visitors.forEach((visitor) => visitor.Once && visitor.Once(node, result));
                },
                Root(node, result) {
                    visitors.forEach((visitor) => visitor.Root && visitor.Root(node, result));
                },
                AtRule(node, result) {
                    visitors.forEach((visitor) => visitor.AtRule && visitor.AtRule(node, result));
                },
                Rule(node, result) {
                    visitors.forEach((visitor) => visitor.Rule && visitor.Rule(node, result));
                },
                Declaration(node, result) {
                    visitors.forEach((visitor) => visitor.Declaration && visitor.Declaration(node, result));
                },
                OnceExit(node, result) {
                    visitors.forEach((visitor) => visitor.OnceExit && visitor.OnceExit(node, result));
                },
                RootExit(node, result) {
                    visitors.forEach((visitor) => visitor.RootExit && visitor.RootExit(node, result));
                },
                AtRuleExit(node, result) {
                    visitors.forEach((visitor) => visitor.AtRuleExit && visitor.AtRuleExit(node, result));
                },
                RuleExit(node, result) {
                    visitors.forEach((visitor) => visitor.RuleExit && visitor.RuleExit(node, result));
                },
                DeclarationExit(node, result) {
                    visitors.forEach((visitor) => visitor.DeclarationExit && visitor.DeclarationExit(node, result));
                },
            };
        },
    };
}
