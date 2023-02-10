import chai from 'chai';
import { parse } from '@chialab/estransform';
import { transform, wrapDynamicRequire, detectUmdGlobalVariable } from '../lib/index.js';

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

            const { processor } = await parse(`(function (root, factory) {
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
            }));`);

            const globalVariable = detectUmdGlobalVariable(processor);
            expect(globalVariable).to.be.equal('amdWeb');
        });

        it('should detect amdWebGlobal', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/amdWebGlobal.js

            const { processor } = await parse(`(function (root, factory) {
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
            }));`);

            const globalVariable = detectUmdGlobalVariable(processor);
            expect(globalVariable).to.be.equal('amdWebGlobal');
        });

        it('should detect returnExports', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/returnExports.js

            const { processor } = await parse(`(function (root, factory) {
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
            }));`);

            const globalVariable = detectUmdGlobalVariable(processor);
            expect(globalVariable).to.be.equal('returnExports');
        });

        it('should detect returnExports (simplified)', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/returnExports.js

            const { processor } = await parse(`(function (root, factory) {
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
            }));`);

            const globalVariable = detectUmdGlobalVariable(processor);
            expect(globalVariable).to.be.equal('returnExports');
        });

        it('should detect commonjsStrict', async () => {
            // https://github.com/umdjs/umd/blob/master/templates/commonjsStrict.js

            const { processor } = await parse(`(function (root, factory) {
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
            }));`);

            const globalVariable = detectUmdGlobalVariable(processor);
            expect(globalVariable).to.be.equal('commonJsStrict');
        });

        describe('common libraries', () => {
            it('docx', async () => {
                const { processor } = await parse(`(function webpackUniversalModuleDefinition(root, factory) {
                    if(typeof exports === 'object' && typeof module === 'object')
                        module.exports = factory();
                    else if(typeof define === 'function' && define.amd)
                        define([], factory);
                    else if(typeof exports === 'object')
                        exports["docx"] = factory();
                    else
                        root["docx"] = factory();
                })(typeof self !== 'undefined' ? self : this, function() {});`);

                const globalVariable = detectUmdGlobalVariable(processor);
                expect(globalVariable).to.be.equal('docx');
            });

            it('mapbox', async () => {
                const { processor } = await parse(`(function (global, factory) {
                    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
                    typeof define === 'function' && define.amd ? define(factory) :
                    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.mapboxgl = factory());
                })(this, (function () {}));`);

                const globalVariable = detectUmdGlobalVariable(processor);
                expect(globalVariable).to.be.equal('mapboxgl');
            });

            it('pdfjs', async () => {
                const { processor } = await parse(`(function webpackUniversalModuleDefinition(root, factory) {
                    if(typeof exports === 'object' && typeof module === 'object')
                        module.exports = factory();
                    else if(typeof define === 'function' && define.amd)
                        define("pdfjs-dist/build/pdf", [], factory);
                    else if(typeof exports === 'object')
                        exports["pdfjs-dist/build/pdf"] = factory();
                    else
                        root["pdfjs-dist/build/pdf"] = root.pdfjsLib = factory();
                })(globalThis, () => {});`);

                const globalVariable = detectUmdGlobalVariable(processor);
                expect(globalVariable).to.be.equal('pdfjsLib');
            });

            it('uri-js', async () => {
                const { processor } = await parse(`(function (global, factory) {
                    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
                    typeof define === 'function' && define.amd ? define(['exports'], factory) :
                    (factory((global.URI = global.URI || {})));
                }(this, (function (exports) { 'use strict'; })));`);

                const globalVariable = detectUmdGlobalVariable(processor);
                expect(globalVariable).to.be.equal('URI');
            });
        });
    });
});
