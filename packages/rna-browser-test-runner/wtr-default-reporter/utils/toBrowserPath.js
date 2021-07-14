"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBrowserPath = void 0;
const path_1 = __importDefault(require("path"));
function toBrowserPath(filePath) {
    return filePath.split(path_1.default.sep).join('/');
}
exports.toBrowserPath = toBrowserPath;
//# sourceMappingURL=toBrowserPath.js.map