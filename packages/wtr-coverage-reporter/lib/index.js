import { coverageReport, createCoverageReporter } from '@chialab/es-test-runner';

/**
 * Print coverage summary.
 * @param {keyof import('@chialab/es-test-runner').ReportOptions} report
 */
export function coverageReporter(report = 'text-summary') {
    /**
     * @type {import('@web/test-runner-core').Logger}
     */
    let logger;

    /**
     * @type {import('@web/test-runner-core').Reporter}
     */
    const reporter = {
        start({ config }) {
            logger = config.logger;
        },

        onTestRunFinished({ testCoverage }) {
            if (!testCoverage) {
                return;
            }

            const context = coverageReport.createContext({
                watermarks: {
                    statements: [50, 80],
                    functions: [50, 80],
                    branches: [50, 80],
                    lines: [50, 80],
                },
                coverageMap: testCoverage.coverageMap,
            });
            const writeFile = context.writer.writeFile;
            context.writer.writeFile = function (file) {
                const content = writeFile.call(this, file);
                content.println = logger.log.bind(logger);

                return content;
            };

            const reporter = createCoverageReporter(report);
            reporter.execute(context);
        },
    };

    return reporter;
}
