import path from 'path';
import { parentPort, workerData } from 'worker_threads';
import Mocha from 'mocha';
import { glob } from '@chialab/node-resolve';

const mocha = new Mocha({
    reporter: 'spec',
});

mocha.ui('bdd');
mocha.timeout(10000);

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

        files.forEach((file) => mocha.addFile(file));
        await mocha.loadFilesAsync();

        const failures = await new Promise((resolve) => mocha.run((failures) => resolve(failures)));
        if (parentPort) {
            parentPort.postMessage({
                event: 'end',
                data: failures,
            });
        }
    });
}
