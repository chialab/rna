import { promises } from 'fs';

/**
 * Memoize fs `readFile` results.
 * @return A function with the same `readFile` signature.
 */
const memoReadFile = function() {
    const { readFile } = promises;
    /**
     * @type {{ [key: string]: Promise<string> }}
     */
    const files = {};
    /**
     * @param {string} fileName
     */
    const memo = async function memo(fileName) {
        const contentRequest = files[fileName] || readFile(fileName, 'utf-8');
        files[fileName] = contentRequest;
        return await contentRequest;
    };

    return memo;
};

/**
 * The momoized `readFile` function.
 */
export const readFile = memoReadFile();
