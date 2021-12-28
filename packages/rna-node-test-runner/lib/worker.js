import path from 'path';
import { parentPort, workerData } from 'worker_threads';
import { TestRunner } from '@chialab/es-test-runner';
import { glob } from '@chialab/node-resolve';

const runner = new TestRunner({
    reporter: 'spec',
});

runner.ui('bdd');
runner.timeout(10000);

if (parentPort) {
    parentPort.on('message', async ({ event }) => {
        if (event !== 'run') {
            return;
        }

        /**
         * @type {string[]}
         */
        const specs = workerData.files;
        const files = (await Promise.all(specs.map((source) => glob(source))))
            .reduce((acc, files) => [
                ...acc,
                ...files.map((file) => path.resolve(file)),
            ], /** @type {string[]} */[]);

        files.forEach((file) => runner.addFile(file));
        await runner.loadFilesAsync();

        const failures = await new Promise((resolve) => runner.run((failures) => resolve(failures)));
        if (parentPort) {
            parentPort.postMessage({
                event: 'end',
                data: failures,
            });
        }
    });
}
