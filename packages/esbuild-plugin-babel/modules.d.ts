declare module '@babel/plugin-syntax-jsx' {
    export interface Options {}
    export type PluginList = ReadonlyArray<PluginListItem>;
    export type PluginListItem = string | RegExp;
}

declare module 'babel-plugin-htm' {
    export interface Options {
        tag?: string;
        pragma: string;
    }

    export type PluginList = ReadonlyArray<PluginListItem>;
    export type PluginListItem = string | RegExp;
}
