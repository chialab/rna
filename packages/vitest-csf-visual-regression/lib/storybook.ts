import 'storybook/internal/csf';

declare module 'storybook/internal/csf' {
    export interface BaseAnnotations {
        visualRegression?: import('./index').CsfVisualRegressionParams;
    }
}
