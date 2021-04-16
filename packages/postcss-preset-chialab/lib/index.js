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
        prepare() {
            const plugins = [
                autoprefixer({
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
            return {
                Once(node, result) {
                    plugins.forEach((plugin) => plugin.Once && plugin.Once(node, result));
                },
                Root(node, result) {
                    plugins.forEach((plugin) => plugin.Root && plugin.Root(node, result));
                },
                AtRule(node, result) {
                    plugins.forEach((plugin) => plugin.AtRule && plugin.AtRule(node, result));
                },
                Rule(node, result) {
                    plugins.forEach((plugin) => plugin.Rule && plugin.Rule(node, result));
                },
                Declaration(node, result) {
                    plugins.forEach((plugin) => plugin.Declaration && plugin.Declaration(node, result));
                },
                OnceExit(node, result) {
                    plugins.forEach((plugin) => plugin.OnceExit && plugin.OnceExit(node, result));
                },
                RootExit(node, result) {
                    plugins.forEach((plugin) => plugin.RootExit && plugin.RootExit(node, result));
                },
                AtRuleExit(node, result) {
                    plugins.forEach((plugin) => plugin.AtRuleExit && plugin.AtRuleExit(node, result));
                },
                RuleExit(node, result) {
                    plugins.forEach((plugin) => plugin.RuleExit && plugin.RuleExit(node, result));
                },
                DeclarationExit(node, result) {
                    plugins.forEach((plugin) => plugin.DeclarationExit && plugin.DeclarationExit(node, result));
                },
            };
        },
    };
}
