import configure from '@jimp/custom';
import jpeg from '@jimp/jpeg';
import resize from '@jimp/plugin-resize';
import png from '@jimp/png';

const Jimp = configure({
    types: [jpeg, png],
    plugins: [resize],
});

/**
 * @template T
 * @typedef {T extends PromiseLike<infer U> ? U : T} ThenArg
 */

/**
 * @typedef {ThenArg<ReturnType<typeof Jimp['read']>>} Image
 */

export default Jimp;
