'use strict';
(() => {
    // lib.worker.js
    var postMessage = globalThis.postMessage;

    // worker.js
    postMessage('message');
})();
