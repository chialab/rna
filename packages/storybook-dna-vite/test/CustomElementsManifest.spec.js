import { dnaPlugins } from '@chialab/cem-analyzer';
import { describe, expect, test } from 'vitest';
import { customElementsManifestPlugin } from '../lib/index.js';

describe('generate custom elements manifest', () => {
    test('DNA module', async () => {
        const plugin = customElementsManifestPlugin({
            renderer: '@chialab/storybook-dna',
            plugins: [...dnaPlugins],
        });

        const result = await plugin.transform?.(
            `import { customElement, Component, property } from '@chialab/dna';

@customElement('dna-test')
export class Test extends Component {
    @property({
        attribute: 'test-prop',
    }) testProp?: string;
}
`,
            'Test.ts'
        );

        expect(result).toBeDefined();
        expect(result?.code).toMatchSnapshot();
    });
});
