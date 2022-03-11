declare module '@custom-elements-manifest/analyzer/src/create.js' {
    export function create(options: { modules: import('typescript').SourceFile[], plugins: any[] }): { modules: any[] };
}

declare module '@storybook/core-common' {
    export interface StoriesSpecifier {
        titlePrefix?: string;
        directory: string;
        files?: string;
    }

    export type NormalizedStoriesSpecifier = Required<StoriesSpecifier> & {
        importPathMatcher: RegExp;
    }
}

declare module '@storybook/core-server/dist/cjs/utils/StoryIndexGenerator.js' {
    import { Path } from '@storybook/store';
    import { NormalizedStoriesSpecifier } from '@storybook/core-common';

    export class StoryIndexGenerator {
        constructor(specifiers: NormalizedStoriesSpecifier[], options: {
            workingDir: Path;
            configDir: Path;
            storiesV2Compatibility: boolean;
        });

        initialize(): Promise<void>;
        getIndex(): Promise<any>;
    }
}

declare module '@storybook/mdx2-csf/dist/esm/index.js' {
    export const plugin: import('unified').Plugin;
    export function postprocess(code: string, store: unknown): string;
}
