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
