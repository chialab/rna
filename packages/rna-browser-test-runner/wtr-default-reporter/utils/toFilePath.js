"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFilePath = void 0;
const path_1 = __importDefault(require("path"));
/**
 * Transforms a file system path to a browser URL. For example windows uses `\` on the file system,
 * but it should use `/` in the browser.
 */
function toFilePath(browserPath) {
    return browserPath.split('/').join(path_1.default.sep);
}
exports.toFilePath = toFilePath;
//# sourceMappingURL=toFilePath.js.map