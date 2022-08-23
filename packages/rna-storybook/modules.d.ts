declare module '@custom-elements-manifest/analyzer/src/create.js' {
    import type { SourceFile } from 'typescript';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function create(options: { modules: SourceFile[]; plugins: any[] }): { modules: any[] };
}

declare module '@storybook/core-server/dist/cjs/utils/StoryIndexGenerator.js' {
    import { StoryIndexGenerator } from '@storybook/core-server';

    export { StoryIndexGenerator };
}

declare module '@storybook/mdx2-csf/dist/cjs/index.js' {
    import type { Plugin } from 'unified';

    export const plugin: Plugin;
    export function postprocess(code: string, store: unknown): string;
    export function compile();
}
