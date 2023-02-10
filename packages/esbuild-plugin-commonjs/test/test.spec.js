import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import commonjsPlugin from '@chialab/esbuild-plugin-commonjs';
import { expect } from 'chai';

describe('esbuild-plugin-commonjs', () => {
    it('should skip if target is not esm', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `module.exports = {
    method() {
        return true;
    },
};`,
            },
            format: 'cjs',
            bundle: true,
            write: false,
            sourcemap: false,
            plugins: [
                commonjsPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
module.exports = {
  method() {
    return true;
  }
};
`);
    });

    it('should export legacy module with default specifier', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `module.exports = {
    method() {
        return true;
    },
};`,
            },
            format: 'esm',
            bundle: true,
            write: false,
            sourcemap: false,
            plugins: [
                commonjsPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var exports = {};
var module = {
  get exports() {
    return exports;
  },
  set exports(value) {
    exports = value;
  }
};
module.exports = {
  method() {
    return true;
  }
};
var __export0;
if (Object.isExtensible(module.exports) && Object.keys(module.exports).length === 1) {
  __export0 = module.exports["method"];
}
var test_spec_default = module.exports;
export {
  test_spec_default as default,
  __export0 as method
};
`);
    });

    it('should bundle using the commonjs helper', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `module.exports = {
    method() {
        return require('fs');
    },
};`,
            },
            format: 'esm',
            platform: 'node',
            bundle: true,
            write: false,
            sourcemap: false,
            plugins: [
                commonjsPlugin({
                    helperModule: true,
                }),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
import * as $cjs$fs from "fs";

// commonjs-helper:./__cjs_helper__.js
function __cjs_default__(requiredModule) {
  var Object2 = (typeof window !== "undefined" && window || typeof self !== "undefined" && self || typeof global !== "undefined" && global || typeof globalThis !== "undefined" && globalThis || {}).Object;
  var isEsModule = false;
  var specifiers = Object2.create(null);
  var hasNamedExports = false;
  var hasDefaultExport = false;
  Object2.defineProperty(specifiers, "__esModule", {
    value: true,
    enumerable: false,
    configurable: true
  });
  if (requiredModule) {
    var names = Object2.getOwnPropertyNames(requiredModule);
    ;
    names.forEach(function(k) {
      if (k === "default") {
        hasDefaultExport = true;
      } else if (!hasNamedExports && k != "__esModule") {
        try {
          hasNamedExports = requiredModule[k] != null;
        } catch (err) {
        }
      }
      Object2.defineProperty(specifiers, k, {
        get: function() {
          return requiredModule[k];
        },
        enumerable: true,
        configurable: false
      });
    });
    if (Object2.getOwnPropertySymbols) {
      var symbols = Object2.getOwnPropertySymbols(requiredModule);
      symbols.forEach(function(k) {
        Object2.defineProperty(specifiers, k, {
          get: function() {
            return requiredModule[k];
          },
          enumerable: false,
          configurable: false
        });
      });
    }
    Object2.preventExtensions(specifiers);
    Object2.seal(specifiers);
    if (Object2.freeze) {
      Object2.freeze(specifiers);
    }
  }
  if (hasNamedExports) {
    return specifiers;
  }
  if (hasDefaultExport) {
    if (Object2.isExtensible(specifiers.default) && !("default" in specifiers.default)) {
      Object2.defineProperty(specifiers.default, "default", {
        value: specifiers.default,
        configurable: false,
        enumerable: false
      });
    }
    return specifiers.default;
  }
  return specifiers;
}

// test.spec.js
var exports = {};
var module = {
  get exports() {
    return exports;
  },
  set exports(value) {
    exports = value;
  }
};
module.exports = {
  method() {
    return __cjs_default__(typeof $cjs$fs !== "undefined" ? $cjs$fs : {});
  }
};
var __export0;
if (Object.isExtensible(module.exports) && Object.keys(module.exports).length === 1) {
  __export0 = module.exports["method"];
}
var test_spec_default = module.exports;
export {
  test_spec_default as default,
  __export0 as method
};
`);
    });

    it('should rename require in mixed modules', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `export default {
    method() {
        if (typeof require === 'function') {
            return require('fs');
        }
    },
};`,
            },
            format: 'esm',
            platform: 'node',
            bundle: true,
            write: false,
            sourcemap: false,
            plugins: [
                commonjsPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});

// test.spec.js
var test_spec_default = {
  method() {
    if (typeof __require === "function") {
      (() => {
        try {
          return (() => {
            return __require("fs");
          })();
        } catch (err) {
        }
      })();
    }
  }
};
export {
  test_spec_default as default
};
`);
    });
});
