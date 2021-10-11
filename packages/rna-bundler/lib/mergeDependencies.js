import path from 'path';
import { getResultDependencies } from '@chialab/esbuild-plugin-dependencies';

/**
 * @param {import('esbuild').BuildResult} result
 * @param {string} root
 * @return {import('@chialab/esbuild-plugin-dependencies').DependenciesMap}
 */
export function mergeDependencies(result, root) {
    const dependencies = getResultDependencies(result) || {};
    const { metafile } = result;
    if (!metafile) {
        return dependencies;
    }
    for (const out of Object.values(metafile.outputs)) {
        if (!out.entryPoint) {
            continue;
        }

        const entryPoint = path.resolve(root, out.entryPoint);
        const list = dependencies[entryPoint] = dependencies[entryPoint] || [];
        list.push(...Object.keys(out.inputs).map((file) => path.resolve(root, file)));
    }

    return dependencies;
}
