/**
 * @import { ComponentInstance } from '@chialab/dna'
 */

/**
 * Collect connected nodes.
 * @type {Map<string, ComponentInstance[]>}
 */
const connectedNodes = new Map();

/**
 * Add a node to the connected list.
 * @param {ComponentInstance} node The node to register.
 */
export function connect(node) {
    const list = getConnected(node.is);
    list.push(node);
}

/**
 * Remove a node from the connected list.
 * @param {ComponentInstance} node The node to unregister.
 */
export function disconnect(node) {
    const list = getConnected(node.is);
    if (list.includes(node)) {
        list.splice(list.indexOf(node), 1);
    }
}

/**
 * Get connected nodes for a given name.
 * @template {ComponentInstance} T
 * @param {string} name
 * @returns {T[]} A live array of connected nodes.
 */
export function getConnected(name) {
    const list = /** @type {T[]} */ (connectedNodes.get(name) || []);
    connectedNodes.set(name, list);

    return list;
}
