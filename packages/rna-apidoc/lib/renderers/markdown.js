import { slug, getChildren, getDescription, getReturnDescription, getTags } from '../helpers.js';

/**
 * @param {import('typedoc').JSONOutput.Reflection} node
 * @return {string}
 */
function renderLink(node) {
    return `<a href="#${slug(node)}">${node.name}</a>`;
}

/**
 * @param {import('typedoc').JSONOutput.ReflectionGroup[]} groups
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderSummary(groups, json) {
    if (!groups.length) {
        return '';
    }

    return groups.map((group) => `
**${group.title.replace(' aliases', 's')}**

${getChildren(group, json).map((node) => renderLink(node)).join(', ')}
`).join('\n\n');
}

/**
 * @param {import('typedoc').JSONOutput.ReflectionGroup} group
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderGroup(group, json) {
    return getChildren(group, json)
        .map((node) => `\n<hr />\n\n${renderNode(node, json)}`)
        .join('\n');
}

/**
 * @param {import('typedoc').JSONOutput.Reflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderNode(node, json) {
    switch (node.kindString) {
        case 'Class':
            return renderClass(node, json);
        case 'Function':
            return renderFunction(node, json);
        case 'Type alias':
            return renderTypeAlias(node, json);
        case 'Variable':
            return renderVariable(node, json);
    }
    return `<span id="${slug(node)}">${renderKind(node)}${node.name}</span>`;
}

/**
 * @param {import('typedoc').JSONOutput.Reflection} node
 * @return {string}
 */
function renderKind(node) {
    if (!node.kindString) {
        return '';
    }
    return `<code>${node.kindString.replace(' alias', '')}</code> `;
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderTypeAlias(node, json) {
    const description = getDescription(node);
    const samples = getTags(node, 'example');
    const links = getTags(node, 'see');
    return `<strong${` id="${slug(node)}"`}><code>Type</code> ${node.name}${node.typeParameter ? renderTypeParams(node.typeParameter, json) : ''}</strong>
    ${renderInfo(node)}
${description ? `<p>

${description.trim()}

</p>
` : ''}

<pre>${renderType(node.type, json)}</pre>

${samples.length ? `
<strong>Examples</strong>

${renderExamples(samples)}

` : ''}
${links.length ? `
<strong>See also</strong>

${renderLinks(links)}` : ''}

`;
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderVariable(node, json) {
    const description = getDescription(node);
    return `<strong${` id="${slug(node)}"`}><code>Variable</code> ${node.name}${node.typeParameter ? renderTypeParams(node.typeParameter, json) : ''}</strong>
    ${renderInfo(node)}
${description ? `<p>

${description.trim()}

</p>
` : ''}

<pre>${renderType(node.type, json)}</pre>
`;
}

/**
 * @param {import('typedoc').JSONOutput.CommentTag[]} samples
 * @return {string}
 */
function renderExamples(samples) {
    return samples
        .map((tag) => tag.text)
        .join('\n\n')
        .replace(/</g, '&lt;')
        .replace(/＠/g, '@');
}

/**
 * @param {import('typedoc').JSONOutput.Reflection} node
 * @return {string}
 */
function renderInfo(node) {
    let deprecated = getTags(node, 'deprecated')[0];
    let since = getTags(node, 'since')[0];
    if (!deprecated && !since) {
        return '';
    }
    let message = '';
    if (deprecated) {
        message += `**Deprecated** ${deprecated.text || ''}  \n`;
    }
    if (since && since.text) {
        message += `**Since** ${since.text}  \n`;
    }
    return `${message}`;
}

/**
 * @param {import('typedoc').JSONOutput.CommentTag[]} links
 * @return {string}
 */
function renderLinks(links) {
    return links
        .map((tag) => `* ${tag.text}`)
        .join('\n\n');
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderFunction(node, json) {
    const signatures = node.signatures || [];
    const description = getDescription(node);
    const samples = getTags(node, 'example');
    const links = getTags(node, 'see');
    const returnDescription = getReturnDescription(node);
    return `<strong${node.kindString === 'Constructor' ? '' : ` id="${slug(node)}"`}><code>Function</code> ${node.name}</strong>

    ${renderInfo(node)}

${description ? `<p>

${description.trim()}

</p>
` : ''}
${signatures.map((signature) => `<details>
<summary>
    <code>${renderSignature(signature, json, false)}</code>
</summary>
<br />
${signature.parameters && signature.parameters.length ? `
<strong>Params</strong>
<table>
    <thead>
        <th align="left">Name</th>
        <th align="left">Type</th>
        <th align="center">Optional</th>
        <th align="left">Description</th>
    </thead>
    <tbody>
        <tr>${signature.parameters.map((param) => `
            <td>${param.name}</td>
            <td><code>${renderType(param.type, json)}</code></td>
            <td align="center">${param.flags && param.flags.isOptional ? '✓' : ''}</td>
            <td>${getDescription(param)}</td>`).join('</tr>\n<tr>')}
        </tr>
    </tbody>
</table>


` : ''}
${signature.type ? `<strong>Returns</strong>: <code>${renderType(signature.type, json).replace(/\n/g, ' ')}</code> ${returnDescription || ''}` : ''}

</details>`).join('\n')}

${samples.length ? `
<strong>Examples</strong>

${renderExamples(samples)}

` : ''}
${links.length ? `
<strong>See also</strong>


${renderLinks(links)}


` : ''}
`;
}

/**
 * @param {import('typedoc').JSONOutput.ParameterReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderParam(node, json) {
    return `${node.name}${node.flags.isOptional ? '?' : ''}: ${renderType(node.type, json)}`;
}

/**
 * @param {import('typedoc').JSONOutput.SignatureReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderSignature(node, json, arrow = true) {
    return `${node.kindString === 'Constructor signature' ? 'new ' : ''}${node.typeParameter ? renderTypeParams(node.typeParameter, json) : ''}(${node.parameters ? node.parameters.map((param) => renderParam(param, json)).join(', ') : ''})${arrow ? ' =>' : ':'} ${renderType(node, json)}`;
}

/**
 * @param {import('typedoc').JSONOutput.TypeParameterReflection[]} nodes
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderTypeParams(nodes, json) {
    return `&lt;${nodes.map((type) => renderTypeParam(type, json)).join(', ')}&gt;`;
}

/**
 * @param {import('typedoc').JSONOutput.TypeParameterReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderTypeParam(node, json) {
    return `${node.name}${node.type ? ` extends ${renderType(node, json)}` : ''}`;
}

/**
 * @param {*} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderType(node, json) {
    if (node.type === 'literal') {
        return `${node.value}`;
    }
    if (node.type === 'intrinsic') {
        return node.name;
    }
    if (node.type === 'reflection') {
        return renderType(node.declaration, json);
    }
    if (node.type === 'query') {
        return renderType(node.queryType, json);
    }
    if (node.type === 'reference') {
        return renderLink(node);
    }
    if (node.type === 'array') {
        let type = renderType(node.elementType, json);
        return `${type.replace(/(<([^>]+)>)/gi, '').trim().includes(' ') ? `(${type})` : type}[]`;
    }
    if (node.type === 'predicate') {
        return `${node.asserts ? 'assert ' : ''}${node.name} is ${renderType(node.targetType, json)}`;
    }
    if (node.type === 'intersection') {
        return node.types.map(
            /**
             * @param {*} type
             */
            (type) => renderType(type, json)
        ).join(' & ');
    }
    if (node.type === 'union') {
        return node.types.map(
            /**
             * @param {*} type
             */
            (type) => renderType(type, json)
        ).join(' | ');
    }
    if (node.type === 'tuple') {
        return `[${node.elements.map(
            /**
             * @param {*} type
             */
            (type) => renderType(type, json)
        ).join(', ')}]`;
    }
    if (typeof node.type === 'object') {
        return renderType(node.type, json);
    }
    if (node.indexSignature) {
        return renderType(node.indexSignature, json);
    }
    if (node.signatures) {
        return node.signatures.map(
            /**
             * @param {*} type
             */
            (type) => renderSignature(type, json)
        ).join('\n');
    }
    if (node.id) {
        return renderObject(node, json);
    }

    return '';
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderClass(node, json) {
    const description = getDescription(node);
    const samples = getTags(node, 'example');
    const links = getTags(node, 'see');

    /**
     * @type {import('typedoc').JSONOutput.DeclarationReflection[]}
     */
    const instanceProperties = [];
    /**
     * @type {import('typedoc').JSONOutput.DeclarationReflection[]}
     */
    const staticProperties = [];

    (node.children || [])
        .filter((member) => member.kindString === 'Property')
        .forEach((member) => {
            if (member.flags.isStatic) {
                staticProperties.push(member);
            } else {
                instanceProperties.push(member);
            }
        });

    /**
     * @type {import('typedoc').JSONOutput.DeclarationReflection[]}
     */
    const instanceMethods = [];
    /**
     * @type {import('typedoc').JSONOutput.DeclarationReflection[]}
     */
    const staticMethods = [];
    (node.children || [])
        .filter((member) => member.kindString === 'Method' || member.kindString === 'Constructor')
        .forEach((member) => {
            if (member.flags.isStatic) {
                staticMethods.push(member);
            } else {
                instanceMethods.push(member);
            }
        });

    return `<strong id="${slug(node)}"><code>Class</code> ${node.name}</strong>

${renderInfo(node)}

${node.extendedTypes && node.extendedTypes.length ? `<strong>Extends:</strong> ${renderType(node.extendedTypes[0], json)}` : ''}
${description ? `<p>

${description.trim()}

</p>` : ''}

${samples.length ? `
<strong>Examples</strong>

${renderExamples(samples)}` : ''}

${instanceProperties.length ? `
<strong>Propertie</strong>

${renderProperties(instanceProperties)}` : ''}

${instanceMethods.length ? `
<strong>Methods</strong>

${instanceMethods.map((method) => renderFunction(method, json)).join('\n<br />\n\n')}` : ''}

${staticProperties.length ? `
<strong>Static properties</strong>

${renderProperties(staticProperties)}` : ''}

${staticMethods.length ? `
<strong>Static methods</strong>

${staticMethods.map((method) => renderFunction(method, json)).join('\n<br />\n\n')}` : ''}

${links.length ? `
<strong>See also</strong>

${renderLinks(links)}` : ''}

`;
}

/**
 * @param {import('typedoc').JSONOutput.ContainerReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderObject(node, json, level = 1, size = 2) {
    return `{
${(node.children || [])
        .map(
            /**
             * @param {import('typedoc').JSONOutput.Reflection} child
             */
            (child) => {
                if (child.kindString === 'Property') {
                    return renderProperty(child, json);
                }
                if (child.kindString === 'Method') {
                    return renderMethod(child, json);
                }
                return renderNode(child, json);
            }
        ).map((line) => line.replace(/^/gm, ''.padStart(size * level, ' '))).join(';\n')}
}`;
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection[]} nodes
 * @return {string}
 */
function renderProperties(nodes) {
    return `<table>
        <thead>
            <th align="left">Name</th>
            <th align="left">Type</th>
            <th align="left">Readonly</th>
            <th align="left">Description</th>
        </thead>
        <tbody>
            <tr>${nodes.map((prop) => `
                <td>${prop.name}</td>
                <td><code>${prop.kindString}</code></td>
                <td align="center">${(prop.flags.isReadonly) ? '✓' : ''}</td>
                <td>${getDescription(prop)}</td>`).join('</tr>\n<tr>')}
            </tr>
        </tbody>
    </table>`;
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderProperty(node, json) {
    return `${node.name}${node.flags.isOptional ? '?' : ''}: ${renderType(node.type, json)}`;
}

/**
 * @param {import('typedoc').JSONOutput.DeclarationReflection} node
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @return {string}
 */
function renderMethod(node, json) {
    if (!node.signatures) {
        return `${node.name}(): unknown`;
    }
    return node.signatures
        .map((signature) => `${node.name}${renderSignature(signature, json, false)}`)
        .join('\n');
}

/**
 * @param {import('typedoc').JSONOutput.ProjectReflection} json
 * @param {{ header?: string, footer?: string }} options
 */
export default function(json, options = {}) {
    let output = options.header || '';

    if (json.groups) {
        const groups = json.groups.filter((group) => group.children && group.children.length);
        output += renderSummary(groups, json);

        if (groups.length) {
            output += '\n';
            output += groups
                .map((group) => renderGroup(group, json))
                .join('\n');
        }
    }

    output += options.footer || '';
    return output;
}
