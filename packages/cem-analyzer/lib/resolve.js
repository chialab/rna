/**
 * @import { SourceFile } from './source-file.js'
 */

/**
 * @param {SourceFile[]} sourceFiles
 * @returns {(from: string, to: string) => string | null}
 */
export function createResolve(sourceFiles) {
    const RESOLVE_VARIANTS = [
        '.js',
        '.mjs',
        '.cjs',
        '.jsx',
        '.ts',
        '.mts',
        '.cts',
        '.tsx',
        '/index.js',
        '/index.mjs',
        '/index.cjs',
        '/index.jsx',
        '/index.ts',
        '/index.mts',
        '/index.cts',
        '/index.tsx',
    ];

    return (to, from) => {
        if (to[0] !== '.' && to[0] !== '/') {
            return to;
        }

        const resolvedPath = new URL(to, `file://${from}`).pathname;

        for (const { fileName } of sourceFiles) {
            if (resolvedPath === fileName) {
                return fileName;
            }
            for (const variant of RESOLVE_VARIANTS) {
                if (resolvedPath + variant === fileName) {
                    return fileName;
                }
            }
        }

        return resolvedPath;
    };
}
