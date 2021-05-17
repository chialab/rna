/**
 * Generate a slug for the node.
 * @param {import('typedoc').JSONOutput.Reflection} node
 * @return {string}
 */
export function slug(node) {
    return node.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * @param {import('typedoc').JSONOutput.ReflectionGroup} group
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {import('typedoc').JSONOutput.Reflection[]}
 */
export function getChildren(group, json) {
    const projectChildren = json.children;
    if (!projectChildren) {
        return [];
    }
    if (!group.children) {
        return [];
    }
    return group.children.map((child) => /** @type {import('typedoc').JSONOutput.Reflection} */ (projectChildren.find(({ id }) => (id === child))));
}

/**
 * @param {import('typedoc').JSONOutput.Reflection} node
 * @return {string}
 */
export function getDescription(node) {
    return node.comment && node.comment.shortText || '';
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection} node
 * @return {string}
 */
export function getReturnDescription(node) {
    if (!node.signatures) {
        return '';
    }
    const signature = node.signatures[0];
    if (!signature) {
        return '';
    }
    return signature.comment && signature.comment.returns || '';
}

/**
 * @param {import('typedoc').JSONOutput.Reflection} node
 * @param {string} name
 * @return {import('typedoc').JSONOutput.CommentTag[]}
 */
export function getTags(node, name) {
    if (!node.comment) {
        return [];
    }
    if (!node.comment.tags) {
        return [];
    }
    return node.comment.tags.filter((tag) => tag.tag === name);
}
