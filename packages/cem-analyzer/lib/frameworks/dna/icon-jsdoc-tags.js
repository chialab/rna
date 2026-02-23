/**
 * @import { ClassDeclaration } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/** @returns {Plugin} */
export function iconJSDocTagsPlugin() {
    return {
        name: 'DNA-ICON-JSDOC-TAGS',
        analyzePhase({ node, moduleDoc }) {
            if (node.type !== 'ClassDeclaration') {
                return;
            }
            const className = node.id?.name;
            const classDoc =
                /** @type {(ClassDeclaration & { icons?: { name: string; description: string }[]; }) | undefined} */ (
                    moduleDoc.declarations?.find((declaration) => declaration.name === className)
                );
            if (!classDoc) {
                return;
            }

            const jsdoc = this.parseJSDoc(node);
            jsdoc.forEach((doc) => {
                doc.tags.forEach((tag) => {
                    if (tag.tag === 'icon') {
                        classDoc.icons ??= [];
                        classDoc.icons.push({
                            name: tag.name,
                            description: tag.description.replace(/^\s*-\s+/, ''),
                        });
                    }
                });
            });
        },
    };
}
