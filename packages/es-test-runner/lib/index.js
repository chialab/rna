import { Report as CoverageReport } from 'c8';
import coverageReport from 'istanbul-lib-report';
import { create as createCoverageReporter } from 'istanbul-reports';
import createTestRunner, { reporters, Runner, Suite, Test } from 'mocha';

/**
 * @typedef {import('mocha').MochaOptions} MochaOptions
 */

/**
 * @typedef {import('istanbul-reports').ReportOptions} ReportOptions
 */

export { CoverageReport, coverageReport, createCoverageReporter, reporters, createTestRunner, Runner, Suite, Test };
