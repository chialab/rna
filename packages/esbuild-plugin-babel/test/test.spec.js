import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import babelPlugin from '@chialab/esbuild-plugin-babel';
import { expect } from 'chai';

describe('esbuild-plugin-babel', () => {
    it('should transform code to es5', async () => {
        const { outputFiles: [result] } = await esbuild.build({
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
            plugins: [
                babelPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var nil = function nil2() {
};
export {
  nil
};
`);
    });

    it('should transform code using babel config', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/input.js', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('fixture', import.meta.url)),
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                babelPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// fixture/input.js
var nil = function nil2() {
};
export {
  nil
};
`);
    });

    it('should transform using babel runtime', async () => {
        const { outputFiles: [result] } = await esbuild.build({
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
            plugins: [
                babelPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`import _asyncToGenerator from "@babel/runtime/helpers/esm/asyncToGenerator";
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

    it('should bundle babel runtime', async () => {
        const { outputFiles: [result] } = await esbuild.build({
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
            plugins: [
                babelPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// ../../../node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(obj) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(obj2) {
    return typeof obj2;
  } : function(obj2) {
    return obj2 && "function" == typeof Symbol && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
  }, _typeof(obj);
}

// ../../../node_modules/@babel/runtime/helpers/esm/toPrimitive.js
function _toPrimitive(input, hint) {
  if (_typeof(input) !== "object" || input === null)
    return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input, hint || "default");
    if (_typeof(res) !== "object")
      return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}

// ../../../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return _typeof(key) === "symbol" ? key : String(key);
}

// ../../../node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
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
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function(sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), true).forEach(function(key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function(key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
var map = _objectSpread({}, {});
export {
  map
};
`);
    });

    it('should convert tagget templates like jsx', async () => {
        const { outputFiles: [result] } = await esbuild.build({
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
            plugins: [
                babelPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var template = h("div", null);
export {
  template
};
`);
    });
});
