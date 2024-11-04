/**
 * Resolve the first source file from the input config.
 * @param {import('@chialab/rna-config-loader').Input} input
 */
export function resolveSourceFile(input) {
    if (typeof input === 'string') {
        return input;
    }
    if (Array.isArray(input)) {
        if (typeof input[0] === 'string') {
            return input[0];
        }
        return input[0].in;
    }
    return Object.values(input)[0];
}
