import { fileURLToPath } from 'url';
import babelPlugin from '@chialab/esbuild-plugin-babel';
import esbuild from 'esbuild';
import { describe, expect, test } from 'vitest';

describe('esbuild-plugin-babel', () => {
    test('should transform code to es5', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const nil = () => {};',
            },
            target: 'es5',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [babelPlugin()],
        });

        expect(result.text).toBe(`// test.spec.js
var nil = function nil2() {
};
export {
  nil
};
`);
    });

    test('should transform code using babel config', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.js', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [babelPlugin()],
        });

        expect(result.text).toBe(`// fixture/input.js
var nil = function nil2() {
};
export {
  nil
};
`);
    });

    test('should transform using babel runtime', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const nil = async () => {};',
            },
            target: 'es5',
            format: 'esm',
            bundle: false,
            write: false,
            plugins: [babelPlugin()],
        });

        expect(result.text).toBe(`import _asyncToGenerator from "@babel/runtime/helpers/esm/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
var nil = /* @__PURE__ */ function() {
  var _ref = _asyncToGenerator(/* @__PURE__ */ _regeneratorRuntime.mark(function _callee() {
    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1)
        switch (_context.prev = _context.next) {
          case 0:
          case "end":
            return _context.stop();
        }
    }, _callee);
  }));
  return function nil2() {
    return _ref.apply(this, arguments);
  };
}();
export {
  nil
};
`);
    });

    test('should bundle babel runtime', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const map = { ...{} }',
            },
            target: 'es5',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [babelPlugin()],
        });

        expect(result.text).toBe(`// ../../../node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}

// ../../../node_modules/@babel/runtime/helpers/esm/toPrimitive.js
function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t)
    return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i))
      return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}

// ../../../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js
function toPropertyKey(t) {
  var i = toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : String(i);
}

// ../../../node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(obj, key, value) {
  key = toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

// test.spec.js
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
var map = _objectSpread({}, {});
export {
  map
};
`);
    });

    test('should convert tagget templates like jsx', async () => {
        const {
            outputFiles: [result],
        } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const template = html`<div />`;',
            },
            target: 'es5',
            format: 'esm',
            bundle: true,
            write: false,
            jsxFactory: 'h',
            plugins: [babelPlugin()],
        });

        expect(result.text).toBe(`// test.spec.js
var template = h("div", null);
export {
  template
};
`);
    });
});
