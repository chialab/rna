import visitor from '@swc/core/Visitor.js';

/** @type {typeof import('@swc/core/Visitor').default} */
let Visitor = (/** @type {*} */ (visitor));

if (typeof (/** @type {*} */ (Visitor)).default === 'function') {
    Visitor = (/** @type {*} */ (Visitor)).default;
}

export { Visitor };
