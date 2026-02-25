/**
 * @import { Plugin } from 'vite';
 * @import { Plugin as AnalyzerPlugin } from '@chialab/cem-analyzer';
 * @import { CustomElement } from 'custom-elements-manifest/schema';
 */
import { createSourceFiles, generate } from '@chialab/cem-analyzer';
import { createFilter } from '@rollup/pluginutils';
import MagicString from 'magic-string';

/**
 * @typedef {{ include?: string | RegExp | string[] | RegExp[]; exclude?: string | RegExp | string[] | RegExp[]; renderer: string; plugins?: AnalyzerPlugin[]; }} CustomElementsManifestOptions
 */

/**
 * A Vite plugin that generates a custom elements manifest for the project and injects it into the bundle.
 * @param {CustomElementsManifestOptions} options
 * @returns {Plugin}
 */
export default function customElementsManifestPlugin(options) {
    const filter = createFilter(options.include || /\.(m?ts|[jt]sx)$/, options.exclude);
    const manifests = new Map();

    return {
        name: 'vite:storybook-cem',

        apply: 'serve',

        enforce: 'pre',

        async transform(code, id) {
            if (!filter(id)) {
                return;
            }

            const modules = await createSourceFiles({
                [id]: code,
            });

            const customElementsManifest = await generate(modules, {
                plugins: options.plugins,
                resolve: this.resolve
                    ? async (source, importer) => {
                          return (await this.resolve(source, importer))?.id || null;
                      }
                    : undefined,
                thirdPartyManifests: Array.from(manifests.values()),
            });

            if (!customElementsManifest.modules) {
                return;
            }

            const declarations = customElementsManifest.modules.flatMap((mod) => mod.declarations ?? []);
            const customElements = /** @type {CustomElement[]} */ (
                declarations.filter(
                    (decl) =>
                        /** @type {CustomElement} */ (decl).customElement &&
                        /** @type {CustomElement} */ (decl).attributes &&
                        /** @type {CustomElement} */ (decl).members
                )
            );

            customElements.forEach((decl) => {
                decl.attributes?.forEach((attr) => {
                    const member = decl.members?.find((m) => m.name === attr.fieldName);
                    if (!member) {
                        return;
                    }

                    attr.type = undefined;
                    attr.default = undefined;
                });
            });

            const output = new MagicString(code);
            output.prepend(`import * as __STORYBOOK_WEB_COMPONENTS__ from '${options.renderer}';\n`);
            output.append(`\n;(function() {
    const { getCustomElementsManifest, setCustomElementsManifest, mergeCustomElementsManifests } = __STORYBOOK_WEB_COMPONENTS__;
    if (!setCustomElementsManifest) {
        console.debug('Custom Element Manifest is not supported by this version of Storybook.');
        return;
    }

    const customElementManifest = ${JSON.stringify(customElementsManifest)};
    const globalCustomElementsManifest = getCustomElementsManifest() || {};
    setCustomElementsManifest(mergeCustomElementsManifests(globalCustomElementsManifest, customElementManifest));
}());`);

            return {
                code: output.toString(),
                map: output.generateMap(),
            };
        },
    };
}
