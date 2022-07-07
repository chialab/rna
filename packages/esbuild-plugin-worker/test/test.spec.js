import path from 'path';
import esbuild from 'esbuild';
import workerPlugin from '@chialab/esbuild-plugin-worker';
import { expect } from 'chai';

describe('esbuild-plugin-worker', () => {
    it('should load a classic worker with bundle', async () => {
        const { outputFiles: [result, worker] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const worker = new Worker(\'./worker.js\');',
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var worker = new Worker(new URL("./worker.js?hash=5f77c0c4", import.meta.url).href);
export {
  worker
};
`);
        expect(worker.text).to.be.equal(`"use strict";
(() => {
  // lib.worker.js
  var postMessage = globalThis.postMessage;

  // worker.js
  postMessage("message");
})();
`);
        expect(path.dirname(result.path)).to.be.equal(path.dirname(worker.path));
    });

    it('should load a classic worker without bundle', async () => {
        const { outputFiles: [result, worker] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const worker = new Worker(\'./worker.js\');',
            },
            format: 'esm',
            outdir: 'out',
            bundle: false,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`const worker = new Worker(new URL("./worker.js?hash=5f77c0c4", import.meta.url).href);
export {
  worker
};
`);
        expect(worker.text).to.be.equal(`"use strict";
(() => {
  // lib.worker.js
  var postMessage = globalThis.postMessage;

  // worker.js
  postMessage("message");
})();
`);
        expect(path.dirname(result.path)).to.be.equal(path.dirname(worker.path));
    });

    it('should load a module worker with bundle', async () => {
        const { outputFiles: [result, worker] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const worker = new Worker(\'./worker.js\', { type: "module" });',
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var worker = new Worker(new URL("./worker.js?hash=a564928d", import.meta.url).href, { type: "module" });
export {
  worker
};
`);
        expect(worker.text).to.be.equal(`// lib.worker.js
var postMessage = globalThis.postMessage;

// worker.js
postMessage("message");
`);
        expect(path.dirname(result.path)).to.be.equal(path.dirname(worker.path));
    });

    it('should load a module worker without bundle', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const worker = new Worker(\'./worker.js\', { type: "module" });',
            },
            format: 'esm',
            outdir: 'out',
            bundle: false,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        const [result, worker] = outputFiles;

        expect(result.text).to.be.equal(`const worker = new Worker(new URL("./worker.js?hash=5a665960", import.meta.url).href, { type: "module" });
export {
  worker
};
`);
        expect(worker.text).to.be.equal(`import { postMessage } from "./lib.worker.js";
postMessage("message");
`);
        expect(path.dirname(result.path)).to.be.equal(path.dirname(worker.path));
    });

    it('should proxy a worker request', async () => {
        const { outputFiles: [result, worker] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const worker = new Worker(\'./worker.js\');',
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                workerPlugin({ proxy: true }),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var worker = new Worker(URL.createObjectURL(new Blob(['importScripts("' + function(path) {
  const url = new URL(path);
  url.searchParams.set("transform", '{"format":"iife","bundle":true,"platform":"neutral","external":[]}');
  return url.href;
}(new URL("./worker.js?hash=5f77c0c4", import.meta.url).href) + '");'], { type: "text/javascript" })));
export {
  worker
};
`);
        expect(worker.text).to.be.equal(`"use strict";
(() => {
  // lib.worker.js
  var postMessage = globalThis.postMessage;

  // worker.js
  postMessage("message");
})();
`);
        expect(path.dirname(result.path)).to.be.equal(path.dirname(worker.path));
    });

    it('should proxy an unknown worker request', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: 'export const worker = new Worker(workerName);',
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                workerPlugin({ proxy: true }),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var worker = new Worker(typeof workerName !== "string" ? workerName : URL.createObjectURL(new Blob(['importScripts("' + function(path) {
  const url = new URL(path);
  url.searchParams.set("transform", '{"format":"iife","bundle":true,"platform":"neutral","external":[]}');
  return url.href;
}(workerName) + '");'], { type: "text/javascript" })));
export {
  worker
};
`);
    });

    it('should skip unknown worker class', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: `export const worker = new Worker('./worker.js');
export const fakeWorker = new ctx.Worker('./worker.js');`,
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var worker = new Worker(new URL("./worker.js?hash=5f77c0c4", import.meta.url).href);
var fakeWorker = new ctx.Worker("./worker.js");
export {
  fakeWorker,
  worker
};
`);
    });

    it('should detect local Worker definitions', async () => {
        const { outputFiles: [result, worker] } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            stdin: {
                resolveDir: new URL('.', import.meta.url).pathname,
                sourcefile: new URL(import.meta.url).pathname,
                contents: `class Worker {};
export const local = new Worker('./worker.js');
export const worker = new window.Worker('./worker.js');`,
            },
            format: 'esm',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`// test.spec.js
var Worker = class {
};
var local = new Worker("./worker.js");
var worker = new window.Worker(new URL("./worker.js?hash=5f77c0c4", import.meta.url).href);
export {
  local,
  worker
};
`);
        expect(worker.text).to.be.equal(`"use strict";
(() => {
  // lib.worker.js
  var postMessage = globalThis.postMessage;

  // worker.js
  postMessage("message");
})();
`);
        expect(path.dirname(result.path)).to.be.equal(path.dirname(worker.path));
    });
});
