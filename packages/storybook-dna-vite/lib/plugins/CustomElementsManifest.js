/**
 * @import { Plugin } from 'vite';
 * @import { Plugin as AnalyzerPlugin, SourceFile } from '@chialab/cem-analyzer';
 * @import { CustomElement } from 'custom-elements-manifest/schema';
 */
import { createSourceFile as createSourceFileFallback, generate } from '@chialab/cem-analyzer';
import MagicString from 'magic-string';
import { createFilter } from 'vite';

/**
 * @typedef {{ include?: string | RegExp | string[] | RegExp[]; exclude?: string | RegExp | string[] | RegExp[]; renderer: string; plugins?: AnalyzerPlugin[]; }} CustomElementsManifestOptions
 */

/**
 * @type {Map<string, Promise<unknown>>}
 */
const importCache = new Map();

/**
 * Attempts to dynamically import a module and returns null if the module is not found.
 * @param {string} moduleName The name of the module to import.
 * @returns {Promise<unknown>} The imported module or null if not found.
 */
async function tryImport(moduleName) {
    const loadPromise =
        importCache.get(moduleName) ||
        import(moduleName).catch((err) => {
            if (/** @type {{ code?: string }} */ (err).code === 'ERR_MODULE_NOT_FOUND') {
                return null;
            }
            throw err;
        });
    importCache.set(moduleName, loadPromise);
    return await loadPromise;
}

/**
 * Creates a SourceFile from the given code and identifier.
 * @param {string} id The identifier (file path) of the source code.
 * @param {string} code The source code to create the SourceFile from.
 * @returns {Promise<SourceFile>} The created SourceFile.
 */
async function createSourceFile(id, code) {
    const rolldown = /** @type {typeof import('rolldown/utils') | null} */ (await tryImport('rolldown/utils'));
    if (rolldown?.parse) {
        const { program, comments } = await rolldown.parse(id, code);
        return {
            fileName: id,
            program,
            comments,
        };
    }

    return createSourceFileFallback(id, code);
}

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

        enforce: 'pre',

        async transform(code, id) {
            if (!filter(id)) {
                return;
            }

            const sourceFile = await createSourceFile(id, code);
            const customElementsManifest = await generate([sourceFile], {
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
