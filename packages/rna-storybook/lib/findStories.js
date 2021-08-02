import path from 'path';
import glob from 'fast-glob';

/**
 * @param {string} rootDir
 * @param {string[]} storiesPatterns
 */
export async function findStories(rootDir, storiesPatterns) {
    const storyPaths = await glob(storiesPatterns, { cwd: rootDir, absolute: false });
    return storyPaths.map((p) => path.join(rootDir, p.split('/').join(path.sep)));
}
