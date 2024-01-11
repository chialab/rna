import { readFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import { pkgUp } from '@chialab/node-resolve';
import { test as coreTest } from '@chialab/rna-browser-test-runner';
import { mochaReporter } from '@chialab/wtr-mocha-reporter';
import { createSauceLabsLauncher } from '@web/test-runner-saucelabs';
import { fixLauncher } from './fixLauncher.js';
import { testJob, testName } from './info.js';
import { sauceReporter } from './reporter.js';

/**
 * Start the test runner.
 * @param {import('@chialab/rna-browser-test-runner').TestRunnerConfig} config
 * @param {import('saucelabs').SauceLabsOptions} sauceOptions
 * @param {import('@chialab/rna-logger').Logger} logger
 * @returns {Promise<import('@chialab/rna-browser-test-runner').TestRunner>} The test runner instance.
 */
export async function test(config, sauceOptions, logger) {
    config = { ...config };

    const packageFile = await pkgUp();
    const packageJson = packageFile ? JSON.parse(await readFile(packageFile, 'utf-8')) : {};
    const sauceCapabilities = {
        name: testName(packageJson.name || path.basename(process.cwd())),
        build: testJob(),
    };

    const sauceLabsLauncher = createSauceLabsLauncher(sauceOptions, sauceCapabilities, { noSslBumpDomains: 'all' });
    const { getSauceCapabilities } = await import('./getSauceLauncherData.js');

    /**
     * @type {string[]}
     */
    const browsers = [];
    if (!config.browsers || config.browsers.length == 0) {
        browsers.push(...JSON.parse(await readFile(new URL('./browsers/modern.json', import.meta.url), 'utf-8')));
    }
    if (Array.isArray(config.browsers)) {
        let list = [.../** @type {string[]} */ (config.browsers)];
        if (list.includes('modern')) {
            browsers.push(...JSON.parse(await readFile(new URL('./browsers/modern.json', import.meta.url), 'utf-8')));
            list = list.filter((entry) => entry !== 'modern');
        }
        if (list.includes('legacy')) {
            browsers.push(...JSON.parse(await readFile(new URL('./browsers/legacy.json', import.meta.url), 'utf-8')));
            list = list.filter((entry) => entry !== 'legacy');
        }

        browsers.push(...list);
    }

    config.browsers = [...browsers.map((browser) => fixLauncher(sauceLabsLauncher(getSauceCapabilities(browser))))];
    config.browserLogs = false;
    config.concurrency = 1;
    config.testsStartTimeout = Math.max(3 * 60 * 1000, config.testsStartTimeout || 0);
    config.testsFinishTimeout = Math.max(3 * 60 * 1000, config.testsFinishTimeout || 0);
    config.reporters = [mochaReporter(), sauceReporter(sauceOptions)];

    return coreTest(config, logger);
}
