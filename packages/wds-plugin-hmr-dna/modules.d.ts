declare module '@open-wc/dev-server-hmr' {
    import type { Plugin } from '@web/dev-server-core';

    interface BaseClass {
        name: string;
        import?: string;
    }

    interface Decorator {
        name: string;
        import?: string;
    }

    interface FunctionOption {
        name: string;
        import?: string;
    }

    interface Preset {
        baseClasses: BaseClass[];
        decorators: Decorator[];
        patch: string;
    }

    export interface WcHmrPluginConfig {
        include?: string[];
        exclude?: string[];
        presets?: Preset[];
        baseClasses?: BaseClass[];
        decorators?: Decorator[];
        functions?: FunctionOption[];
        patches?: string[];
    }

    const hmrPlugin: (options: WcHmrPluginConfig) => Plugin;
    export { hmrPlugin };
}
