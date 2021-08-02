declare module '@mdx-js/mdx';

declare module '@custom-elements-manifest/analyzer/src/create.js' {
    export function create(options: { modules: import('typescript').SourceFile[], plugins: any[] }): { modules: any[] };
}
