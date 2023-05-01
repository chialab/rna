import { fileURLToPath } from 'url';
import path from 'path';
import esbuild from 'esbuild';
import workerPlugin from '@chialab/esbuild-plugin-worker';
import { expect } from 'chai';

describe('esbuild-plugin-worker', () => {
    it('should load a classic worker with bundle', async () => {
        const { outputFiles: [result, worker] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const worker = new Worker(new URL(\'./worker.js\', import.meta.url));',
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
var worker = new Worker(new URL("./worker-iife.js?hash=5f77c0c4", import.meta.url).href);
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
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const worker = new Worker(new URL(\'./worker.js\', import.meta.url));',
            },
            format: 'esm',
            outdir: 'out',
            bundle: false,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`const worker = new Worker(new URL("./worker-iife.js?hash=5f77c0c4", import.meta.url).href);
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
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const worker = new Worker(new URL(\'./worker.js\', import.meta.url), { type: "module" });',
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
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const worker = new Worker(new URL(\'./worker.js\', import.meta.url), { type: "module" });',
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
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const worker = new Worker(new URL(\'./worker.js\', import.meta.url));',
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
  url.searchParams.set("transform", '{"format":"iife","bundle":true,"platform":"neutral"}');
  return url.href;
}(new URL("./worker-iife.js?hash=5f77c0c4", import.meta.url).href) + '");'], { type: "text/javascript" })));
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
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
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
  url.searchParams.set("transform", '{"format":"iife","bundle":true,"platform":"neutral"}');
  return url.href;
}(workerName) + '");'], { type: "text/javascript" })));
export {
  worker
};
`);
    });

    it('should skip unknown worker class', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `export const worker = new Worker(new URL('./worker.js', import.meta.url));
export const fakeWorker = new ctx.Worker(new URL('./worker.js', import.meta.url));`,
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
var worker = new Worker(new URL("./worker-iife.js?hash=5f77c0c4", import.meta.url).href);
var fakeWorker = new ctx.Worker(new URL("./worker.js?hash=a564928d", import.meta.url));
export {
  fakeWorker,
  worker
};
`);
    });

    it('should detect local Worker definitions', async () => {
        const { outputFiles: [result, worker] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: `class Worker {};
export const local = new Worker(new URL('./worker.js', import.meta.url));
export const worker = new window.Worker(new URL('./worker.js', import.meta.url));`,
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
var local = new Worker(new URL("./worker.js?hash=a564928d", import.meta.url));
var worker = new window.Worker(new URL("./worker-iife.js?hash=5f77c0c4", import.meta.url).href);
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

    it('should inline worker with iife format', async () => {
        const { outputFiles: [result] } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            stdin: {
                resolveDir: fileURLToPath(new URL('.', import.meta.url)),
                sourcefile: fileURLToPath(import.meta.url),
                contents: 'export const worker = new Worker(\'./worker.js\');',
            },
            format: 'iife',
            platform: 'browser',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                workerPlugin(),
            ],
        });

        expect(result.text).to.be.equal(`(() => {
  // test.spec.js
  var worker = new Worker(new URL("data:text/javascript;base64,InVzZSBzdHJpY3QiOwooKCkgPT4gewogIC8vIGxpYi53b3JrZXIuanMKICB2YXIgcG9zdE1lc3NhZ2UgPSBnbG9iYWxUaGlzLnBvc3RNZXNzYWdlOwoKICAvLyB3b3JrZXIuanMKICBwb3N0TWVzc2FnZSgibWVzc2FnZSIpOwp9KSgpOwo="));
})();
`);
    });
});
