import { readFile as fsReadFile } from 'fs/promises';

/**
 * Memoize fs `readFile` results.
 * @returns A function with the same `readFile` signature.
 */
const memoReadFile = function () {
    /**
     * @type {{ [key: string]: Promise<string> }}
     */
    const files = {};
    /**
     * @param {string} fileName
     */
    const memo = async function memo(fileName) {
        files[fileName] = files[fileName] || fsReadFile(fileName, 'utf-8');
        return await files[fileName];
    };

    return memo;
};

/**
 * The momoized `readFile` function.
 */
export const readFile = memoReadFile();
