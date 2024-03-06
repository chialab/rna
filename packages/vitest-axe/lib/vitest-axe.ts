interface AxeMatchers<R = unknown> {
    toHaveNoViolations(): R;
}

declare module '@vitest/expect' {
    interface Assertion<T = any> extends AxeMatchers<T> {}
    interface AsymmetricMatchersContaining extends AxeMatchers {}
}

export {};
