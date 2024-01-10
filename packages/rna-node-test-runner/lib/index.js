import os from 'os';
import path from 'path';
import process from 'process';
import { Worker } from 'worker_threads';
import { mkdtemp } from 'fs/promises';
import { CoverageReport } from '@chialab/es-test-runner';

/**
 * @typedef {Object} TestRunnerConfig
 * @property {string[]} [files] A list or a glob of files to test.
 * @property {boolean} [coverage] Should collect coverage data.
 * @property {Record<string, string>} [alias]
 */

/**
 * Run tests in node environment using mocha.
 * @param {TestRunnerConfig} config
 */
export async function test(config) {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'rna-nyc'));
    process.env.NODE_V8_COVERAGE = tmpDir;

    const worker = new Worker(new URL('./worker.js', import.meta.url), {
        workerData: {
            files: config.files || [
                'test/**/*.test.js',
                'test/**/*.spec.js',
            ],
        },
    });

    const failures = await new Promise((resolve) => {
        worker.on('message', async ({ event, data }) => {
            if (event === 'end') {
                await worker.terminate();
                resolve(data);
            }
        });

        worker.postMessage({ event: 'run' });
    });

    const report = new CoverageReport({
        include: ['**'],
        exclude: [
            'node_modules/**',
            'coverage/**',
            'packages/*/test{,s}/**',
            '**/*.d.ts',
            'test{,s}/**',
            'test{,s}/**',
            'spec{,s}/**',
            'test{,-*}.{js,jsx,cjs,mjs,ts,tsx}',
            'spec{,-*}.{js,jsx,cjs,mjs,ts,tsx}',
            '**/*{.,-}test.{js,jsx,cjs,mjs,ts,tsx}',
            '**/*{.,-}spec.{js,jsx,cjs,mjs,ts,tsx}',
            '**/__tests__/**',
            '**/{ava,babel,nyc}.config.{js,cjs,mjs}',
            '**/jest.config.{js,cjs,mjs,ts}',
            '**/{karma,rollup,webpack}.config.js',
            '**/.{eslint,mocha}rc.{js,cjs}',
        ],
        excludeAfterRemap: true,
        reporter: ['lcov', 'text-summary'],
        reportsDirectory: './coverage',
        tempDirectory: tmpDir,
    });

    await report.run();

    if (failures) {
        throw new Error('Some tests failed');
    }
}
