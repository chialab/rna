export * from './vitest-axe';

export default {
    /**
     * @param {import('axe-core').AxeResults} results
     */
    toHaveNoViolations(results) {
        const violations = results.violations ?? [];

        return {
            pass: violations.length === 0,
            actual: violations,
            message() {
                if (violations.length === 0) {
                    return '';
                }

                return `Expected no accessibility violations but received some.

${violations
    .map(
        (violation) => `[${violation.impact}] ${violation.id}
${violation.description}
${violation.helpUrl}
`
    )
    .join('\n')}
`;
            },
        };
    },
};
