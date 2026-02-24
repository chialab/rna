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
                /** @type {(ClassDeclaration & { locale?: { name: string; description: string }[]; }) | undefined} */ (
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
                        classDoc.locale.push({
                            name: tag.name.replace(/^["']/, '').replace(/["']$/, ''),
                            description: tag.description.replace(/^\s*-\s+/, '').trim() || '',
                        });
                    }
                });
            });
        },
    };
}
