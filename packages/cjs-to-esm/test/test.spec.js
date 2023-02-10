import { readFile } from 'fs/promises';
import chai from 'chai';
import { transform, wrapDynamicRequire } from '../lib/index.js';
import { fileURLToPath } from 'url';

const { expect } = chai;

describe('cjs-to-esm', () => {
    it('should transform require statements', async () => {
        const { code } = await transform(`const fs = require('fs/promises');
fs.readFile('test.js');`, { helperModule: true });

        expect(code).to.equal(`import * as $cjs$fs_promises from "fs/promises";
import __cjs_default__ from './__cjs_helper__.js';
const fs = __cjs_default__(typeof $cjs$fs_promises !== 'undefined' ? $cjs$fs_promises : {});
fs.readFile('test.js');`);
    });

    it('should export non named references as default', async () => {
        const { code } = await transform('module.exports = function() {}', { helperModule: true });

        expect(code).to.equal(`var global = ((typeof window !== 'undefined' && window) ||
(typeof self !== 'undefined' && self) ||
(typeof global !== 'undefined' && global) ||
(typeof globalThis !== 'undefined' && globalThis) ||
{});
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
import __cjs_default__ from './__cjs_helper__.js';
const path = __cjs_default__(typeof $cjs$path !== 'undefined' ? $cjs$path : {});
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

    it('should wrap dynamic require', async () => {
        const { code } = await wrapDynamicRequire('if (typeof require !== \'undefined\') require(\'fs\'); require(\'path\');');

        expect(code).to.equal('if (typeof require !== \'undefined\') (() => { try { return (() => {require(\'fs\');})(); } catch(err) {} })(); require(\'path\');');
    });

    it('should wrap dynamic require blocks', async () => {
        const { code } = await wrapDynamicRequire('if (typeof require !== \'undefined\') { require(\'fs\'); require(\'path\'); }');

        expect(code).to.equal('if (typeof require !== \'undefined\') { (() => { try { return (() => {require(\'fs\'); require(\'path\');})(); } catch(err) {} })(); }');
    });

    describe('umd', () => {
        it('should detect amdWeb', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/amdWeb.js

            const contents = `(function (root, factory) {
                if (typeof define === 'function' && define.amd) {
                    // AMD. Register as an anonymous module.
                    define(['b'], factory);
                } else {
                    // Browser globals
                    root.amdWeb = factory(root.b);
                }
            }(typeof self !== 'undefined' ? self : this, function (b) {
                // Use b in some fashion.

                // Just return a value to define the module export.
                // This example returns an object, but the module
                // can return a function as the exported value.
                return {};
            }));`;
            const { code } = await transform(contents);
            const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

            expect(value).to.be.a('object');
        });

        it('should detect amdWebGlobal', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/amdWebGlobal.js

            const contents = `(function (root, factory) {
                if (typeof define === 'function' && define.amd) {
                    // AMD. Register as an anonymous module.
                    define(['b'], function (b) {
                        // Also create a global in case some scripts
                        // that are loaded still are looking for
                        // a global even when an AMD loader is in use.
                        return (root.amdWebGlobal = factory(b));
                    });
                } else {
                    // Browser globals
                    root.amdWebGlobal = factory(root.b);
                }
            }(typeof self !== 'undefined' ? self : this, function (b) {
                // Use b in some fashion.

                // Just return a value to define the module export.
                // This example returns an object, but the module
                // can return a function as the exported value.
                return {};
            }));`;
            const { code } = await transform(contents);
            const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

            expect(value).to.be.a('object');
        });

        it('should detect returnExports', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/returnExports.js

            const contents = `(function (root, factory) {
                if (typeof define === 'function' && define.amd) {
                    // AMD. Register as an anonymous module.
                    define(['b'], factory);
                } else if (typeof module === 'object' && module.exports) {
                    // Node. Does not work with strict CommonJS, but
                    // only CommonJS-like environments that support module.exports,
                    // like Node.
                    module.exports = factory(require('b'));
                } else {
                    // Browser globals (root is window)
                    root.returnExports = factory(root.b);
                }
            }(typeof self !== 'undefined' ? self : this, function (b) {
                // Use b in some fashion.

                // Just return a value to define the module export.
                // This example returns an object, but the module
                // can return a function as the exported value.
                return {};
            }));`;
            const { code } = await transform(contents);
            const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

            expect(value).to.be.a('object');
        });

        it('should detect returnExports (simplified)', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/returnExports.js

            const contents = `(function (root, factory) {
                if (typeof define === 'function' && define.amd) {
                    // AMD. Register as an anonymous module.
                    define([], factory);
                } else if (typeof module === 'object' && module.exports) {
                    // Node. Does not work with strict CommonJS, but
                    // only CommonJS-like environments that support module.exports,
                    // like Node.
                    module.exports = factory();
                } else {
                    // Browser globals (root is window)
                    root.returnExports = factory();
              }
            }(typeof self !== 'undefined' ? self : this, function () {

                // Just return a value to define the module export.
                // This example returns an object, but the module
                // can return a function as the exported value.
                return {};
            }));`;
            const { code } = await transform(contents);
            const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

            expect(value).to.be.a('object');
        });

        it('should detect commonjsStrict', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/commonjsStrict.js

            const contents = `(function (root, factory) {
                if (typeof define === 'function' && define.amd) {
                    // AMD. Register as an anonymous module.
                    define(['exports', 'b'], factory);
                } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
                    // CommonJS
                    factory(exports, require('b'));
                } else {
                    // Browser globals
                    factory((root.commonJsStrict = {}), root.b);
                }
            }(typeof self !== 'undefined' ? self : this, function (exports, b) {
                // Use b in some fashion.

                // attach properties to the exports object to define
                // the exported module properties.
                exports.action = function () {};
            }));`;
            const { code } = await transform(contents);
            const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

            expect(value).to.be.a('object');
        });

        describe('common libraries', () => {
            let globals;

            beforeEach(() => {
                globals = {
                    Promise: global.Promise,
                };
            });

            afterEach(() => {
                Object.assign(global, globals);
            });

            it('docx', async () => {
                const fixture = fileURLToPath(new URL('fixtures/docx.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.docx).to.be.equal(value);
                expect(value.Body).to.be.a('Function');
            });

            it('mapbox', async () => {
                try {
                    const { JSDOM } = await import('jsdom');
                    const { window } = new JSDOM('');
                    global.window = window;
                    global.document = window.document;

                    const fixture = fileURLToPath(new URL('fixtures/mapbox.js', import.meta.url));
                    const contents = await readFile(fixture, 'utf-8');
                    const { code } = await transform(`var process = undefined;${contents}`);
                    const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                    expect(window.mapboxgl).to.be.equal(value);
                    expect(value.version).to.be.equal('2.14.1');
                } finally {
                    delete global.window;
                    delete global.document;
                }
            });

            it('pdfjs', async () => {
                const fixture = fileURLToPath(new URL('fixtures/pdfjs.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.pdfjsLib).to.be.equal(value);
                expect(value.version).to.be.equal('3.6.172');
            });

            it('uri-js', async () => {
                const fixture = fileURLToPath(new URL('fixtures/uri.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.URI).to.be.equal(value);
                expect(value.name).to.be.equal('URI');
            });

            it('lodash', async () => {
                const fixture = fileURLToPath(new URL('fixtures/lodash.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global._).to.be.equal(value);
                expect(value.name).to.be.equal('lodash');
            });

            it('moment', async () => {
                const fixture = fileURLToPath(new URL('fixtures/moment.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.moment).to.be.equal(value);
                expect(value.now).to.be.a('Function');
            });

            it('bluebird', async () => {
                const fixture = fileURLToPath(new URL('fixtures/bluebird.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.Promise).to.be.equal(value);
            });

            it('axios', async () => {
                const fixture = fileURLToPath(new URL('fixtures/axios.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.axios).to.be.equal(value);
            });

            it('focusVisible', async () => {
                const fixture = fileURLToPath(new URL('fixtures/focus-visible.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(value).to.be.undefined;
            });

            it('tslib', async () => {
                const fixture = fileURLToPath(new URL('fixtures/tslib.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.__extends).to.be.equal(value.__extends);
                expect(value.__extends).to.be.a('Function');
            });

            it('jquery', async () => {
                try {
                    const { JSDOM } = await import('jsdom');
                    const { window } = new JSDOM('');
                    global.window = window;
                    global.document = window.document;

                    const fixture = fileURLToPath(new URL('fixtures/jquery.js', import.meta.url));
                    const contents = await readFile(fixture, 'utf-8');
                    const { code } = await transform(`var process = undefined;${contents}`);
                    const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                    expect(window.$).to.be.equal(value);
                    expect(value.name).to.be.equal('jQuery');
                } finally {
                    delete global.window;
                    delete global.document;
                }
            });

            it('chai', async () => {
                const fixture = fileURLToPath(new URL('fixtures/chai.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

                expect(global.chai).to.be.equal(value);
                expect(value.expect).to.be.a('Function');
            });
        });
    });
});
