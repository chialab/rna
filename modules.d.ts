declare type SourceMap = {
    version: number;
    sources: string[];
    names: string[];
    sourceRoot?: string;
    sourcesContent?: string[];
    mappings: string;
    file: string;
};

declare module '@parcel/source-map' {
    class SourceMapNode {
        setSourceContent(filename: string, contents: string);
        addRawMappings(mapping: SourceMap);
        extends(buffer: Buffer);
        toVLQ(): SourceMap;
        toBuffer(): Buffer;
    };

    export default {
        default: SourceMapNode,
    };
};
