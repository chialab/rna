import path from 'path';
import typescript from 'typescript';
import { useRna } from '@chialab/esbuild-rna';
import { create } from '@custom-elements-manifest/analyzer/src/create.js';
import { parse } from '@chialab/estransform';

/**
 * @typedef {Object} PluginOptions
 * @property {string} [framework]
 * @property {*[]} [plugins]
 */

/**
 * @param {PluginOptions} options
 * @returns An esbuild plugin.
 */
export default function({ framework = '@storybook/web-components', plugins = [] } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'rna-storybook-cem',
        setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { sourcesContent, sourcemap } = build.getOptions();
            const workingDir = build.getWorkingDir();

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                if (args.path.includes('/node_modules/') ||
                    args.path.includes('/@storybook/') ||
                    !args.path.startsWith(build.getSourceRoot())) {
                    return;
                }

                const code = args.code;
                const modules = [
                    typescript.createSourceFile(args.path, code, typescript.ScriptTarget.ESNext, true),
                ];

                const customElementsManifest = create({ modules, plugins });
                if (!customElementsManifest.modules) {
                    return;
                }

                const declarations = customElementsManifest.modules
                    .filter((mod) => mod.declarations)
                    .reduce((acc, mod) => {
                        acc.push(...mod.declarations);
                        return acc;
                    }, []);

                if (declarations.length === 0) {
                    return;
                }

                declarations
                    .filter(
                        /** @param {*} decl */
                        (decl) => decl.customElement && decl.attributes && decl.members
                    )
                    .forEach(
                        /** @param {*} decl */
                        (decl) => {
                            decl.attributes.forEach(
                                /** @param {*} attr */
                                (attr) => {
                                    const member = decl.members.find(
                                        /** @param {*} m */
                                        (m) => m.name === attr.fieldName
                                    );
                                    if (!member) {
                                        return member;
                                    }

                                    attr.name += ' ';
                                    attr.description = `🔗 **${member.name}**`;
                                    attr.type = undefined;
                                    attr.default = undefined;
                                }
                            );
                        }
                    );

                const { helpers } = parse(code, path.relative(workingDir, args.path));
                helpers.prepend(`import * as __STORYBOOK_WEB_COMPONENTS__ from '${framework}';\n`);
                helpers.append(`
;(function() {
    const { getCustomElements, setCustomElementsManifest } = __STORYBOOK_WEB_COMPONENTS__;
    if (!setCustomElementsManifest) {
        console.debug('Custom Element Manifest is not supported by this version of Storybook.');
        return;
    }

    const CUSTOM_ELEMENT_JSON = ${JSON.stringify(customElementsManifest)};
    const CUSTOM_ELEMENTS_JSON = getCustomElements() || {};
    setCustomElementsManifest({
        ...CUSTOM_ELEMENTS_JSON,
        ...CUSTOM_ELEMENT_JSON,
        modules: [
            ...(CUSTOM_ELEMENTS_JSON.modules || []),
            ...(CUSTOM_ELEMENT_JSON.modules || []),
        ],
    });
}())`);

                return helpers.generate({
                    sourcemap: !!sourcemap,
                    sourcesContent,
                });
            });
        },
    };

    return plugin;
}
