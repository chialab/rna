import { TestResultError, TestSession, Logger } from '@web/test-runner-core';
export declare function formatError(error: TestResultError): string;
export declare function reportTestsErrors(logger: Logger, allBrowserNames: string[], favoriteBrowser: string, failedSessions: TestSession[]): void;
//# sourceMappingURL=reportTestsErrors.d.ts.map