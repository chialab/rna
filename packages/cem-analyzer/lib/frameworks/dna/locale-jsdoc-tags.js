/**
 * @import { ClassDeclaration } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/** @returns {Plugin} */
export function localeJSDocTagsPlugin() {
    return {
        name: 'DNA-LOCALE-JSDOC-TAGS',
        analyzePhase({ node, moduleDoc }) {
            if (node.type !== 'ClassDeclaration') {
                return;
            }
            const className = node.id?.name;
            const classDoc =
                /** @type {(ClassDeclaration & { locale?: { value: string; description: string }[]; }) | undefined} */ (
                    moduleDoc.declarations?.find((declaration) => declaration.name === className)
                );
            if (!classDoc) {
                return;
            }

            const jsdoc = this.parseJSDoc(node);
            jsdoc.forEach((doc) => {
                doc.tags.forEach((tag) => {
                    if (tag.tag === 'locale') {
                        classDoc.locale ??= [];

                        const fullText = `${tag.name} ${tag.description}`;
                        const [name, description] = fullText.split(/\s*-\s+/);
                        classDoc.locale.push({
                            value: name.replace(/^["']/, '').replace(/["']$/, ''),
                            description,
                        });
                    }
                });
            });
        },
    };
}
