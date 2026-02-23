import { describe, expect, it } from 'vitest';
import { createSourceFiles, generate } from '../lib/index.js';

describe('05-events', () => {
    it('01-keyboard', async () => {
        const actual = await generate(
            await createSourceFiles({
                './bar.js': /* js */ `
class MyElement extends HTMLElement {
  foo() {
    /**
     * @private
     */
    this.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Tab'
      })
    );
  }
}

customElements.define('my-element', MyElement);
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });
});
