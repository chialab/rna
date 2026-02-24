import { dnaPlugins } from '@chialab/cem-analyzer';
import { describe, expect, test } from 'vitest';
import { customElementsManifestPlugin } from '../lib/index.js';

describe('generate custom elements manifest', () => {
    test('DNA module', async () => {
        const plugin = customElementsManifestPlugin({
            renderer: '@chialab/storybook-dna',
            plugins: [...dnaPlugins()],
        });

        const result = await plugin.transform?.(
            `import { customElement, Component } from '@chialab/dna';

@customElement('dna-test')
export class Test extends Component {
    @property() testProp?: string;
}
`,
            'Test.ts'
        );

        expect(result).toBeDefined();
        expect(result?.code).toEqual(`import * as __STORYBOOK_WEB_COMPONENTS__ from '@chialab/storybook-dna';
import { customElement, Component } from '@chialab/dna';

@customElement('dna-test')
export class Test extends Component {
    @property() testProp?: string;
}

;(function() {
    const { getCustomElementsManifest, setCustomElementsManifest, mergeCustomElementsManifests } = __STORYBOOK_WEB_COMPONENTS__;
    if (!setCustomElementsManifest) {
        console.debug('Custom Element Manifest is not supported by this version of Storybook.');
        return;
    }

    const customElementManifest = {"schemaVersion":"1.0.0","readme":"","modules":[{"kind":"javascript-module","path":"Test.ts","declarations":[{"kind":"class","description":"","name":"Test","members":[{"kind":"field","name":"testProp","type":{"text":"string | undefined"}}],"superclass":{"name":"Component","package":"@chialab/dna"},"tagName":"dna-test","customElement":true}],"exports":[{"kind":"js","name":"Test","declaration":{"name":"Test","module":"Test.ts"}},{"kind":"custom-element-definition","name":"dna-test","declaration":{"name":"Test","module":"Test.ts"}}]}]};
    const globalCustomElementsManifest = getCustomElementsManifest() || {};
    setCustomElementsManifest(mergeCustomElementsManifests(globalCustomElementsManifest, customElementManifest));
}());`);
    });
});
