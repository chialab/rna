import { describe, expect, it } from 'vitest';
import { createSourceFiles, generate } from '../lib/index.js';

describe('04-custom-elements-define', () => {
    it('01-basic', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import {MyFoo} from './foo.js';
import {MyBar} from 'foo';

class MyElement extends HTMLElement {
  foo = 'bar';
}
class MyWindow extends HTMLElement {}

customElements.define('my-foo', MyFoo);
customElements.define('my-bar', MyBar);
customElements.define('my-element', MyElement);
window.customElements.define('my-window', MyWindow);

customElements.define('anon-1', class extends HTMLElement {});

customElements.define('anon-2', class MyEl extends HTMLElement {});
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });
});
