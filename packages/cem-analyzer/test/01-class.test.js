import { describe, expect, it } from 'vitest';
import { createSourceFiles, generate } from '../lib/index.js';

describe('01-class', () => {
    it('default', async () => {
        const actual = await generate(
            await createSourceFiles({
                './bar.js': /* js */ `
const foo = 1;

export const bar = {
  foo,
};
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it('01-fields', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import { buu } from 'buu';
const bar = 'bar';
const foo = 'foo';

/**
 * @property {string} prop5
 */
class MyEl extends HTMLElement {
  prop1 = '';
  prop2;
  prop3;
  prop4;
  prop5;

  /** @type {boolean} */
  set setter() {}
  get setter() {}

  set getter2(){}
  /** @type {string} */
  get getter2(){}

  static getter2;

  /**
   * This is also an attribute
   * @attr also-attr
   * @reflect
   * @type {string}
   */
  alsoAttr;

  /** @public */
  prop6;

  /** @private */
  prop7;

  /** @protected */
  prop8;

  public prop9;
  private prop10;
  protected prop11;

  static prop11;
  static prop12;

  // type inference
  bool = false;
  str = '';
  num = 1;
  arr = [{a: "a", b: 'b', c: \`c\`}, 1, "a", 'b', \`c\`];
  obj = {a: "a", b: 'b', c: \`c\`};
  asVariable = bar;
  asVariableAssignedInConstructor;
  asVariableThirdParty = buu;
  nu = null;
  asConst = 'const' as const;
  asConstRef = {foo:'bar'} as const;

  /** @type {Foo} */
  strOverwritten = '';

  #prop13;

  optional?: string;

  prefixUnary1 = +1;
  prefixUnary2 = -1;
  prefixUnary3 = !1;

  arrowfn = () => {
    console.log('dont output me')
  }

  #truePrivateField = 1;
  #truePrivateMethod() {}

  constructor() {
    super();
    this.prop2 = 'default';
    /** @type {SomeType} - prop3 description */
    this.prop3 = 'default';
    /** @type {import('foo').Some.Type} */
    this.prop4 = 'default';

    this.commaprop1 = 'default',
    this.commaprop2 = true,
    this.commaprop3 = 123;

    this.asVariableAssignedInConstructor = foo;
  }
}
customElements.define('my-el', MyEl);
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it('02-attributes', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
/**
 * @attr {boolean} attr1
 * @attribute {boolean} attr2
 */
class MyEl extends HTMLElement {
  /**
   * @reflect
   * @attr
   */
  myField;

  static observedAttributes = ['a-a', 'b-b'];
  static get observedAttributes() {
    return ['c-c', 'd-d'];
  }
}
customElements.define('my-el', MyEl);

export class Foo extends HTMLElement {
  /**
   * this is the field description
   * @type {string}
   * @attr my-attr this is the attr description
   */
  foo = '';

  /** @type {string} this is the description */
  member = '';

  static observedAttributes = ['my-attr']
}`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it('03-jsdoc', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
// typedef should be ignored
/**
 * @typedef {Object} MenuItem
 * @property {string} icon
 * @property {string} id
 * @property {string} label
 */

/**
 * {@link https://a.b}
 * [CD]{@link https://e.f}
 * {@link g|HIJ}
 * {@link klm En? Oh Pee}
 *
 * @attr {boolean} disabled - disables the element
 * @attribute {string} foo - description for foo
 *
 * @csspart bar - Styles the color of bar
 *
 * @slot - This is the default slot
 * @slot container - You can put some elements here
 *
 * @cssprop --text-color - Controls the color of foo
 * @cssproperty [--background-color=red] - Controls the color of bar
 *
 * @prop {boolean} prop1 - some description
 * @property {number} prop2 - some description
 *
 * @fires custom-event - some description for custom-event
 * @fires {Event} typed-event - some description for typed-event
 * @event {CustomEvent} typed-custom-event - some description for typed-custom-event
 *
 * @summary This is MyElement
 *
 * @tag my-element
 * @tagname my-element
 */
export class MyElement extends HTMLElement {}
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it('04-readonly', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.ts': /* ts */ `
export class MyElement extends HTMLElement {
  /** @readonly */
  foo = 1;

  readonly bar = 2;

  get baz() {}
  set baz() {}

  get qux() {}
}`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it('05-custom-states', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
// typedef should be ignored
/**
 * @cssState active - Applies when the element is active
 */
export class MyElement extends HTMLElement {}
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });
});
