import 'vitest';

interface AxeMatchers<R = unknown> {
    toHaveNoViolations(): R;
}

declare module 'vitest' {
    interface Assertion<T> extends AxeMatchers<T> {}
    interface AsymmetricMatchersContaining extends AxeMatchers {}
}
