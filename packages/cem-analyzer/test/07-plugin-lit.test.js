import { describe, expect, it } from 'vitest';
import { createSourceFiles, generate, litPlugins } from '../lib/index.js';

describe('07-plugin-lit', () => {
    it('01-basic', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import { LitElement, property, customElement } from 'lit-element';

/**
 * @attr my-attr
 * @prop {string} prop1 this is the description
 */
@customElement('my-element')
class MyElement extends LitElement {
  static get properties() {
    return {
      ...super.properties,
      prop1: { type: String }, // has default "'foo'"
      prop2: { type: Boolean },
      attr: { type: String, attribute: 'my-attr' }, // attr output as 'my-attr'
      noAttr: { type: String, attribute: false }, // no attr output
      /**
       * @private
       * @type {Boolean}
       */
      _privateProp: { type: String },
      reflect: {type: Boolean, reflect: true},
      reflect2: {type: Boolean, reflect: true, attribute: 'reflect-2'},
    }
  }

  // also attr
  @property({})
  decoratedProperty = [];

  // attr output with name 'my-attr'
  @property({attribute: 'my-attr2'})
  decoratedPropertyAlsoAttr = [];

  // no attr output
  @property({attribute: false})
  decoratedPropertyNoAttr = [];

  /**
   * @internal
   */
  @property({reflect: true})
  decoratedInternal;

  @property({reflect: true})
  decoratedReflect;

  @property({reflect: true, attribute: 'decorated-reflect'})
  decoratedReflect2;

  prop1 = 'foo';
}

/**
 * Picks up property decorator on mixins as well
 */
export function InputMixin(superClass) {
  class InputElement extends superClass {
    /**
     * this description never gets picked up by the analyzer.
     * so we lose some info about default values and the fact it is both property and attribute
     */
    @property({ type: Boolean }) disabled = false
  }

  return InputElement;
}
`,
            }),
            {
                plugins: litPlugins,
            }
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('02-mixin-property-decorator', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import { LitElement, property, customElement } from 'lit';

@customElement('my-element')
class MyElement extends InputMixin(LitElement) {
  @property({})
  firstName = 'John';
}

export function InputMixin(superClass) {
  class InputMixinImplementation extends superClass {
    @property({ type: Boolean }) disabled = false
  }

  return InputMixinImplementation;
}
`,
            }),
            {
                plugins: litPlugins,
            }
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('03-mixin-static-properties', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import { LitElement } from 'lit';

class MyElement extends InputMixin(LitElement) {
  static properties = {
    firstName: { type: String }
  }

  constructor() {
    super();
    this.firstName = 'John';
  }
}
customElements.define('my-element', MyElement);

export function InputMixin(superClass) {
  class InputMixinImplementation extends superClass {
    static properties = {
      disabled: { type: Boolean }
    }

    constructor() {
      super();
      this.disabled = false;
    }
  }

  return InputMixinImplementation;
}
`,
            }),
            {
                plugins: litPlugins,
            }
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('04-collapsed-mixins-static-properties', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import { LitElement } from 'lit';

class MyElement extends MixinB(MyField) {
  static properties = {
    lastName: { type: String },
  };

  constructor() {
    super();
    this.lastName = 'Doe';
  }
}
customElements.define('my-element', MyElement);

function MixinB(superClass) {
  class MixinBImplementation extends superClass {
    static properties = {
      mixB: { type: Boolean },
    };

    constructor() {
      super();
      this.mixB = false;
    }
  }

  return MixinBImplementation;
}

class MyField extends MixinA(LitElement) {
  static properties = {
    firstName: { type: String },
  };

  constructor() {
    super();
    this.firstName = 'John';
  }
}

function MixinA(superClass) {
  class MixinAImplementation extends superClass {
    static properties = {
      mixA: { type: Boolean },
    };

    constructor() {
      super();
      this.mixA = false;
    }
  }

  return MixinAImplementation;
}
`,
            }),
            {
                plugins: litPlugins,
            }
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('05-mixin-method-deny-list', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
export const MyMixin = (superclass) => class extends superclass {
  foo() {}
  requestUpdate() {}
  firstUpdated() {}
}
`,
            }),
            {
                plugins: litPlugins,
            }
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });
});
