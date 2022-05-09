import createTestRunner, { Runner, reporters, Suite, Test } from 'mocha';
import { Report as CoverageReport } from 'c8';

/**
 * @typedef {import('mocha').MochaOptions} MochaOptions
 */

export { CoverageReport, reporters, createTestRunner, Runner, Suite, Test };
