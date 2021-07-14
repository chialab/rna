import { TestRunnerCoreConfig, TestSessionManager, TestCoverage, CoverageConfig, BrowserLauncher } from '@web/test-runner-core';
export interface TestProgressArgs {
    browsers: BrowserLauncher[];
    browserNames: string[];
    testFiles: string[];
    testRun: number;
    sessions: TestSessionManager;
    startTime: number;
    watch: boolean;
    focusedTestFile?: string;
    coverage: boolean;
    coverageConfig?: CoverageConfig;
    testCoverage?: TestCoverage;
}
export declare function getTestProgressReport(config: TestRunnerCoreConfig, args: TestProgressArgs): string[];
//# sourceMappingURL=getTestProgress.d.ts.map