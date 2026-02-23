import { describe, expect, it } from 'vitest';
import { createSourceFiles, generate } from '../lib/index.js';

describe('06-jsdoc', () => {
    it('default', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
/**
 * @default 'only works on properties'
 */
export class DefaultValues extends HTMLElement {
  /** @default 'default from jsdoc' */
  defaultViaJsDoc;

  /** @default 'default from jsdoc' */
  defaultWhereCodeTakesPrecedence = 'default from code';

  withoutDefault;

  /**
   * Should work with "@attribute" and no name
   * @attribute
   */
  foo = "bar"

  /**
   * Should work with "@attribute" and a name
   * @attribute my-foo
   */
  myFoo = "bar"

  /**
   * Should work with "@attr" and no name
   * @attr
   */
  bar = "bar"

  /**
   * Should work with "@attr" and a name
   * @attr my-bar
   */
  myBar = "bar"
}

customElements.define('default-values', DefaultValues);
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it('ignore-internal', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
/** @internal */
export const dontIncludeMe = false; // should not be in declarations

/** @ignore */
export const meNeither = false; // should not be in declarations

export const variable = 'var';

/** @ignore */
export class IgnoreMe extends HTMLElement { }

/** @deprecated */
export class IamDeprecated extends HTMLElement { }

/** @deprecated the reason for the deprecation. */
export class IamDeprecatedWithReason extends HTMLElement { }

customElements.define("ignore-me", IgnoreMe);

export class IncludeMe extends HTMLElement {
  included = 'hello world';

  /** @ignore */
  sneaky = 'deaky';


  constructor() {
    super();

    /** @ignore */
    this.ignoreThisAlso = 'hidden';
  }

  connectedCallback() {
    super.connectedCallback?.();

    /** @ignore */
    this.dispatchEvent(
        new CustomEvent('my-event', {
          detail: 'foo'
        })
    )

    /** @internal */
    this.dispatchEvent(
        new CustomEvent('my-other-event', {
          detail: 'bar'
        })
    )
  }

  /** @deprecated */
  imDeprecated() {

  }

  /** @deprecated the reason for the deprecation. */
  imDeprecatedWithReason() {

  }

  /** @internal */
  hideMe() {
    return '🙈'
  }
}

customElements.define("include-me", IncludeMe);

/** @ignore */
var ignoreMePlease = 'haha';

/** @internal */
var excludeMe, andMe = 'something private';

export {
  ignoreMePlease,
  excludeMe,
  andMe,
}
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });
});
