"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = void 0;
const http_1 = require("http");
function request(options) {
    return new Promise((resolve, reject) => {
        const req = http_1.request(options, response => {
            let body = '';
            response.on('data', chunk => {
                body += chunk;
            });
            response.on('end', () => {
                resolve({ response, body });
            });
        });
        req.on('error', err => {
            reject(err);
        });
        req.end();
    });
}
exports.request = request;
//# sourceMappingURL=request.js.map