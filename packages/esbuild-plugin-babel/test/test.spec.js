import esbuild from 'esbuild';
import babelPlugin from '@chialab/esbuild-plugin-babel';
import { expect } from 'chai';

describe('esbuild-plugin-babel', () => {
    it('should transform code to es5', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
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
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/input.js', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
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
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
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
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
          case "end":
            return _context.stop();
        }
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
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
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

        expect(result.text).to.be.equal(`// ../../../node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(obj, key, value) {
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
    var source = arguments[i] != null ? arguments[i] : {};
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
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
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
