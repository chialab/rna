import process from 'node:process';
import urlRebase from '@chialab/postcss-url-rebase';
import autoprefixer from 'autoprefixer';
import colorHex from 'postcss-color-hex-alpha';
import customProperties from 'postcss-custom-properties';
import dir from 'postcss-dir-pseudo-class';
import focusVisible from 'postcss-focus-visible';
import focusWithin from 'postcss-focus-within';
import fontVariant from 'postcss-font-variant';
import atImport from 'postcss-import';
import initial from 'postcss-initial';
import logical from 'postcss-logical';
import nesting from 'postcss-nesting';
import pageBreak from 'postcss-page-break';
import place from 'postcss-place';
import anyLink from 'postcss-pseudo-class-any-link';
import replaceOverflow from 'postcss-replace-overflow-wrap';
import url from 'postcss-url';

/**
 * @typedef {Object} PresetOptions
 * @property {boolean} [bundle] Should include plugins to bundle CSS.
 * @property {string} [root] The root dir of the build.
 * @property {string} [assetsPath] Directory to copy assets (relative to to or absolute).
 * @property {boolean} [useHash] Use filehash(xxhash) for naming assets.
 */

/**
 * Create the postcss preset used by Chialab.
 * @param {PresetOptions} options
 * @returns {import('postcss').Plugin}
 */
export default function preset({ bundle = false, root = process.cwd(), assetsPath = '.', useHash = false } = {}) {
    return {
        postcssPlugin: 'preset-chialab',
        prepare(result) {
            const bundlePlugins = bundle
                ? [
                      urlRebase({ root }),
                      atImport({ root }),
                      url({
                          url: 'copy',
                          assetsPath,
                          useHash,
                      }),
                  ]
                : [];

            const plugins = [
                ...bundlePlugins,
                nesting(),
                autoprefixer({
                    overrideBrowserslist: 'ie 11, chrome 30',
                    grid: true,
                    flexbox: true,
                    remove: false,
                }),
                customProperties({
                    preserve: true,
                }),
                initial(),
                anyLink({
                    preserve: true,
                }),
                colorHex({
                    preserve: true,
                }),
                logical({
                    preserve: true,
                }),
                dir({
                    preserve: true,
                }),
                fontVariant(),
                place({
                    preserve: true,
                }),
                pageBreak(),
                replaceOverflow({
                    method: 'copy',
                }),
                focusVisible(),
                focusWithin({
                    replaceWith: '.focus-within',
                }),
            ];
            const visitors = [
                ...plugins.map((plugin) => typeof plugin === 'function' && plugin(result.root)).filter(Boolean),
                ...plugins.map((plugin) => plugin.prepare?.(result)).filter(Boolean),
            ];
            return {
                Once(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.Once?.(node, helpers);
                    });
                },
                Root(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.Root?.(node, helpers);
                    });
                },
                AtRule(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.AtRule?.(node, helpers);
                    });
                },
                Rule(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.Rule?.(node, helpers);
                    });
                },
                Declaration(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.Declaration?.(node, helpers);
                    });
                },
                OnceExit(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.OnceExit?.(node, helpers);
                    });
                },
                RootExit(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.RootExit?.(node, helpers);
                    });
                },
                AtRuleExit(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.AtRuleExit?.(node, helpers);
                    });
                },
                RuleExit(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.RuleExit?.(node, helpers);
                    });
                },
                DeclarationExit(node, helpers) {
                    visitors.forEach((visitor) => {
                        visitor.DeclarationExit?.(node, helpers);
                    });
                },
            };
        },
    };
}
