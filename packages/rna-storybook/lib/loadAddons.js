import { resolve } from '@chialab/node-resolve';

/**
 * @param {string} source
 * @param {string} importer
 * @return {Promise<[string[], string[]]>}
 */
async function loadEntries(source, importer) {
    const managerEntries = [];
    const previewEntries = [];
    const script = await resolve(source, importer);
    const { config: loadPreviewEntries, managerEntries: loadManagerEntries } = await import(script);
    if (typeof loadManagerEntries === 'function') {
        managerEntries.push(...loadManagerEntries());
    }
    if (typeof loadPreviewEntries === 'function') {
        previewEntries.push(...loadPreviewEntries());
    }
    return [
        managerEntries,
        previewEntries,
    ];
}

/**
 * @param {string} source
 * @param {string} importer
 * @return {Promise<[string[], string[]]>}
 */
export async function loadAddon(source, importer) {
    try {
        return await loadEntries(`${source}/preset.js`, importer);
    } catch (err) {
        //
    }
    try {
        const script = await resolve(`${source}/register.js`, importer);
        if (script) {
            return [
                [`${source}/register.js`],
                [],
            ];
        }
    } catch (err) {
        //
    }

    try {
        return await loadEntries(source, importer);
    } catch (err) {
        //
    }

    return [
        [source],
        [],
    ];
}

/**
 *
 * @param {string[]} addons
 * @param {string} importer
 */
export async function loadAddons(addons, importer) {
    const entries = await Promise.all(
        addons.map((source) => loadAddon(source, importer))
    );
    return entries.reduce(([manager, preview], [managerEntries, previewEntries]) => {
        manager.push(...managerEntries);
        preview.push(...previewEntries);
        return /** @type {[string[], string[]]} */ ([manager, preview]);
    }, [[], []]);
}
