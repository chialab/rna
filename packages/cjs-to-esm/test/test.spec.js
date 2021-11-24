import chai from 'chai';
import { transform } from '../lib/index.js';

const { expect } = chai;

describe('cjs-to-esm', () => {
    it('should transform require statements', async () => {
        const { code } = await transform(`const fs = require('fs/promises');
fs.readFile('test.js');`, { helperModule: true });

        expect(code).to.equal(`import * as $cjs$fs_promises from "fs/promises";
import $$cjs_default$$ from './$$cjs_helper$$.js';
const fs = $$cjs_default$$(typeof $cjs$fs_promises !== 'undefined' ? $cjs$fs_promises : {});
fs.readFile('test.js');`);
    });

    it('should export non named references as default', async () => {
        const { code } = await transform('module.exports = function() {}', { helperModule: true });

        expect(code).to.equal(`var global = globalThis;
var exports = {};
var module = {
    get exports() {
        return exports;
    },
    set exports(value) {
        exports = value;
    },
};
module.exports = function() {}
export default module.exports;`);
    });

    it('should ignore require statements in try catch statements', async () => {
        const { code } = await transform(`const path = require('path');
try {
    const fs = require('fs/promises');
    fs.readFile(path.resolve('test.js'));
} catch {}`, { helperModule: true, ignoreTryCatch: true });

        expect(code).to.equal(`import * as $cjs$path from "path";
import $$cjs_default$$ from './$$cjs_helper$$.js';
const path = $$cjs_default$$(typeof $cjs$path !== 'undefined' ? $cjs$path : {});
try {
    const fs = require('fs/promises');
    fs.readFile(path.resolve('test.js'));
} catch {}`);
    });

    it('should throw for mixed modules', async () => {
        const result = await transform(`const fs = require('fs/promises');
import path from 'path';

fs.readFile(path.resolve('test.js'));`).catch((err) => err);

        expect(result).to.be.instanceof(Error);
        expect(result.message).to.be.equal('Cannot convert mixed modules');
    });
});
