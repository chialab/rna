declare module '@custom-elements-manifest/analyzer/src/create.js' {
    import type { SourceFile } from 'typescript';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function create(options: { modules: SourceFile[]; plugins: any[] }): { modules: any[] };
}

declare module '@storybook/core-server/dist/cjs/utils/StoryIndexGenerator.js' {
    import type { Path, StoryId, V2CompatIndexEntry } from '@storybook/store';
    import type { StoryIndexer, NormalizedStoriesSpecifier, DocsOptions } from '@storybook/core-common';

    export class StoryIndexGenerator {
        constructor(specifiers: NormalizedStoriesSpecifier[], options: {
            workingDir: Path;
            configDir: Path;
            storyStoreV7: boolean;
            storiesV2Compatibility: boolean;
            storyIndexers: StoryIndexer[];
            docs: DocsOptions;
        });

        initialize(): Promise<void>;

        getIndex(): Promise<Record<StoryId, V2CompatIndexEntry>>;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getStorySortParameter(): Promise<any> {}
    }
}

declare module '@storybook/mdx2-csf/dist/cjs/index.js' {
    import type { Plugin } from 'unified';

    export const plugin: Plugin;
    export function postprocess(code: string, store: unknown): string;
    export function compile();
}
