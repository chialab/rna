import configure from '@jimp/custom';
import jpeg from '@jimp/jpeg';
import png from '@jimp/png';
import resize from '@jimp/plugin-resize';

export default configure({
    types: [
        jpeg,
        png,
    ],
    plugins: [
        resize,
    ],
});
