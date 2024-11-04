import { Buffer } from 'buffer';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { transform, wrapDynamicRequire } from '../lib/index.js';

describe('cjs-to-esm', () => {
    test('should transform require statements', async () => {
        const { code } = await transform(
            `const fs = require('fs/promises');
fs.readFile('test.js');`,
            { helperModule: true }
        );

        expect(code).toBe(`import * as $cjs$fs_promises from "fs/promises";
import __cjs_default__ from './__cjs_helper__.js';
const fs = __cjs_default__(typeof $cjs$fs_promises !== 'undefined' ? $cjs$fs_promises : {});
fs.readFile('test.js');`);
    });

    test('should export non named references as default', async () => {
        const { code } = await transform('module.exports = function() {}', { helperModule: true });

        expect(code).toBe(`var global = ((typeof window !== 'undefined' && window) ||
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

    test('should ignore require statements in try catch statements', async () => {
        const { code } = await transform(
            `const path = require('path');
try {
    const fs = require('fs/promises');
    fs.readFile(path.resolve('test.js'));
} catch {}`,
            { helperModule: true, ignoreTryCatch: true }
        );

        expect(code).toBe(`import * as $cjs$path from "path";
import __cjs_default__ from './__cjs_helper__.js';
const path = __cjs_default__(typeof $cjs$path !== 'undefined' ? $cjs$path : {});
try {
    const fs = require('fs/promises');
    fs.readFile(path.resolve('test.js'));
} catch {}`);
    });

    test('should throw for mixed modules', async () => {
        const result = await transform(`const fs = require('fs/promises');
import path from 'path';

fs.readFile(path.resolve('test.js'));`).catch((err) => err);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe('Cannot convert mixed modules');
    });

    test('should wrap dynamic require', async () => {
        const { code } = await wrapDynamicRequire(
            "if (typeof require !== 'undefined') require('fs'); require('path');"
        );

        expect(code).toBe(
            "if (typeof require !== 'undefined') (() => { try { return (() => {require('fs');})(); } catch(err) {} })(); require('path');"
        );
    });

    test('should wrap dynamic require blocks', async () => {
        const { code } = await wrapDynamicRequire(
            "if (typeof require !== 'undefined') { require('fs'); require('path'); }"
        );

        expect(code).toBe(
            "if (typeof require !== 'undefined') { (() => { try { return (() => {require('fs'); require('path');})(); } catch(err) {} })(); }"
        );
    });

    describe('umd', () => {
        test('should detect amdWeb', async () => {
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
            const { default: value } = await import(
                `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
            );

            expect(value).toBeTypeOf('object');
        });

        test('should detect amdWebGlobal', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/amdWebGlobalThis.js

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
            const { default: value } = await import(
                `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
            );

            expect(value).toBeTypeOf('object');
        });

        test('should detect returnExports', async () => {
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
            const { default: value } = await import(
                `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
            );

            expect(value).toBeTypeOf('object');
        });

        test('should detect returnExports (simplified)', async () => {
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
            const { default: value } = await import(
                `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
            );

            expect(value).toBeTypeOf('object');
        });

        test('should detect commonjsStrict', async () => {
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
            const { default: value } = await import(
                `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
            );

            expect(value).toBeTypeOf('object');
        });

        describe('common libraries', () => {
            let globals;

            beforeEach(() => {
                globals = {
                    Promise: globalThis.Promise,
                };
            });

            afterEach(() => {
                Object.assign(globalThis, globals);
            });

            test('docx', async () => {
                const fixture = fileURLToPath(new URL('fixtures/docx.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.docx).toBe(value);
                expect(value.Body).toBeTypeOf('function');
            });

            test('mapbox', async () => {
                try {
                    const { JSDOM } = await import('jsdom');
                    const { window } = new JSDOM('');
                    globalThis.window = window;
                    globalThis.document = window.document;

                    const fixture = fileURLToPath(new URL('fixtures/mapbox.js', import.meta.url));
                    const contents = await readFile(fixture, 'utf-8');
                    const { code } = await transform(`var process = undefined;${contents}`);
                    const { default: value } = await import(
                        `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                    );

                    expect(window.mapboxgl).toBe(value);
                    expect(value.version).toBe('2.14.1');
                } finally {
                    delete globalThis.window;
                    delete globalThis.document;
                }
            });

            test('pdfjs', async () => {
                const fixture = fileURLToPath(new URL('fixtures/pdfjs.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.pdfjsLib).toBe(value);
                expect(value.version).toBe('3.6.172');
            });

            test('uri-js', async () => {
                const fixture = fileURLToPath(new URL('fixtures/uri.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.URI).toBe(value);
                expect(value.name).toBe('URI');
            });

            test('lodash', async () => {
                const fixture = fileURLToPath(new URL('fixtures/lodash.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis._).toBe(value);
                expect(value.name).toBe('lodash');
            });

            test('moment', async () => {
                const fixture = fileURLToPath(new URL('fixtures/moment.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.moment).toBe(value);
                expect(value.now).toBeTypeOf('function');
            });

            test('bluebird', async () => {
                const fixture = fileURLToPath(new URL('fixtures/bluebird.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.Promise).toBe(value);
            });

            test('axios', async () => {
                const fixture = fileURLToPath(new URL('fixtures/axios.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.axios).toBe(value);
            });

            test('focusVisible', async () => {
                const fixture = fileURLToPath(new URL('fixtures/focus-visible.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(value).toBeUndefined();
            });

            test('tslib', async () => {
                const fixture = fileURLToPath(new URL('fixtures/tslib.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.__extends).toBe(value.__extends);
                expect(value.__extends).toBeTypeOf('function');
            });

            test('jquery', async () => {
                try {
                    const { JSDOM } = await import('jsdom');
                    const { window } = new JSDOM('');
                    globalThis.window = window;
                    globalThis.document = window.document;

                    const fixture = fileURLToPath(new URL('fixtures/jquery.js', import.meta.url));
                    const contents = await readFile(fixture, 'utf-8');
                    const { code } = await transform(`var process = undefined;${contents}`);
                    const { default: value } = await import(
                        `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                    );

                    expect(window.$).toBe(value);
                    expect(value.name).toBe('jQuery');
                } finally {
                    delete globalThis.window;
                    delete globalThis.document;
                }
            });

            test('chai', async () => {
                const fixture = fileURLToPath(new URL('fixtures/chai.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                expect(globalThis.chai).toBe(value);
                expect(value.expect).toBeTypeOf('function');
            });

            test('webidl-conversions', async () => {
                const fixture = fileURLToPath(new URL('fixtures/webidl-conversions.js', import.meta.url));
                const contents = await readFile(fixture, 'utf-8');
                const { code } = await transform(`var process = undefined;${contents}`);
                const { default: value } = await import(
                    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
                );

                // webidl-conversions exports have spaces in the names. test that this case is handled correctly.
                expect(value['unsigned long long']).toBeTypeOf('function');
            });
        });
    });
});
