/**
 * @import { CustomElementDeclaration } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/** @returns {Plugin} */
export function inheritancePlugin() {
    return {
        name: 'DNA-INHERITANCE',
        packageLinkPhase({ customElementsManifest }) {
            if (!customElementsManifest) {
                return;
            }

            customElementsManifest.modules.forEach((mod) => {
                mod.declarations?.forEach((declaration) => {
                    if (
                        declaration.kind !== 'class' ||
                        !('customElement' in declaration) ||
                        !declaration.customElement
                    ) {
                        return;
                    }

                    const elementDecl =
                        /** @type {CustomElementDeclaration & { locale?: { name: string; description: string }[]; icons?: { name: string; description: string }[]; }} */ (
                            declaration
                        );
                    const superClass = elementDecl.superclass;
                    if (!superClass?.package) {
                        return;
                    }

                    const externalManifests = this.getManifests();
                    const externalManifest = externalManifests.find((manifest) =>
                        manifest.modules?.some((m) => m.path === superClass.package)
                    );
                    if (!externalManifest) {
                        return;
                    }
                    for (const mod of externalManifest.modules) {
                        const decl =
                            /** @type {(CustomElementDeclaration & { locale?: { name: string; description: string }[]; icons?: { name: string; description: string }[]; }) | undefined} */ (
                                mod.declarations?.find((d) => d.name === superClass.name && d.kind === 'class')
                            );
                        if (!decl) {
                            continue;
                        }
                        if (decl.slots) {
                            const slots = elementDecl.slots ?? [];
                            slots.unshift(...decl.slots.filter((slot) => !slots.some((s) => s.name === slot.name)));
                            elementDecl.slots = slots;
                        }
                        if (decl.members) {
                            const members = elementDecl.members ?? [];
                            members.unshift(
                                ...decl.members.filter((member) => !members.some((m) => m.name === member.name))
                            );
                            elementDecl.members = members;
                        }
                        if (decl.events) {
                            const events = elementDecl.events ?? [];
                            events.unshift(
                                ...decl.events.filter((event) => !events.some((e) => e.name === event.name))
                            );
                            elementDecl.events = events;
                        }
                        if (decl.locale) {
                            const locale = elementDecl.locale ?? [];
                            locale.unshift(...decl.locale.filter((loc) => !locale.some((l) => l.name === loc.name)));
                            elementDecl.locale = locale;
                        }
                        if (decl.icons) {
                            const icons = elementDecl.icons ?? [];
                            icons.unshift(...decl.icons.filter((icon) => !icons.some((i) => i.name === icon.name)));
                            elementDecl.icons = icons;
                        }
                    }
                });
            });
        },
    };
}
