declare type SourceMap = {
    version?: number;
    sources: string[];
    names: string[];
    sourceRoot?: string;
    sourcesContent?: string[];
    mappings: string;
    file?: string;
};

declare module '@parcel/source-map' {
    class SourceMapNode {
        setSourceContent(filename: string, contents: string);
        addVLQMap(mapping: SourceMap);
        extends(buffer: Buffer|SourceMapNode);
        toVLQ(): SourceMap;
        toBuffer(): Buffer;
    }

    export default {
        default: SourceMapNode,
    };
};

declare module 'sucrase/dist/parser/index.js' {
    export { File, parse } from 'sucrase';
}

declare module 'sucrase/dist/NameManager.js' {
    export { NameManagerModule as default } from 'sucrase';
}

declare module 'sucrase/dist/HelperManager.js' {
    export { HelperManager } from 'sucrase';
}

declare module 'sucrase/dist/TokenProcessor.js' {
    export { TokenProcessor as default } from 'sucrase';
}

declare module 'sucrase/dist/parser/tokenizer/types.js' {
    export { TokenType } from 'sucrase';
}

declare module 'sucrase/dist/parser/tokenizer/index.js' {
    export { Token } from 'sucrase';
}
