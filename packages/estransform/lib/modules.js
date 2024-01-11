/**
 * @type {Promise<typeof import('cjs-module-lexer')>}
 */
let initializeCjs;

/**
 * @param {string} code
 */
export async function parseCommonjs(code) {
    initializeCjs =
        initializeCjs || import('cjs-module-lexer').then(({ init, parse }) => init().then(() => ({ init, parse })));
    const { parse } = await initializeCjs;
    return parse(code);
}

/**
 * @type {Promise<typeof import('es-module-lexer')>}
 */
let initializeEsm;

/**
 * @param {string} code
 */
export async function parseEsm(code) {
    initializeEsm =
        initializeEsm || import('es-module-lexer').then(({ init, parse }) => init.then(() => ({ init, parse })));
    const { parse } = await initializeEsm;
    return parse(code);
}
