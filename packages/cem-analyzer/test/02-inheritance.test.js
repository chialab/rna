import { describe, expect, it } from 'vitest';
import { createSourceFiles, generate } from '../lib/index.js';

describe('02-inheritance', () => {
    it('01-superclass', async () => {
        const actual = await generate(
            await createSourceFiles({
                './BatchingElement.js': /* js */ `
export class BatchingElement extends HTMLElement {
  superClassField;
  static observedAttributes = [...super.observedAttributes, 'superClass-attr'];
  superClassMethod() {
    this.dispatchEvent(new Event('superClass-event'))
  }

  overriddenField = 'hello';
}
`,
                './implements-element.ts': /* ts */ `
import { ReactiveControllerHost } from '@lit/reactive-element';
import { BatchingElement } from './BatchingElement';

export class ImplementsElement extends BatchingElement implements Pick<ReactiveControllerHost, 'implementsMethod'> {
  classField;

  static get observedAttributes() {
    return [...super.observedAttributes, 'class-attr']
  };

  async implementsMethod() {}

  classMethod() {
    this.dispatchEvent(new Event('class-event'))
  }
}
`,
                './my-element.js': /* js */ `
import { BatchingElement } from './BatchingElement';

export class MyElement extends BatchingElement {
  classField;
  static observedAttributes = [...super.observedAttributes, 'class-attr'];
  classMethod() {
    this.dispatchEvent(new Event('class-event'))
  }

  overriddenField = 'bye';
}
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('02-mixins', async () => {
        const actual = await generate(
            await createSourceFiles({
                './ModuleMixin.js': /* js */ `
export const ModuleMixin = klass => class extends klass {
  moduleMixinField;
  static observedAttributes = [...super.observedAttributes, 'moduleMixin-attr'];
  moduleMixinMethod() {
    this.dispatchEvent(new Event('moduleMixin-event'))
  }
}`,
                './my-element.js': /* js */ `
import { ModuleMixin } from './ModuleMixin.js';

export const NestedMixin = klass => class extends klass {
  nestedMixinField;
  static observedAttributes = [...super.observedAttributes, 'nestedMixin-attr'];
  nestedMixinMethod() {
    this.dispatchEvent(new Event('nestedMixin-event'))
  }
}

export const MyMixin = klass => class extends NestedMixin(klass) {
  mixinField;
  static observedAttributes = [...super.observedAttributes, 'mixin-attr'];
  mixinMethod() {
    this.dispatchEvent(new Event('mixin-event'))
  }
}

export class MyElement extends ModuleMixin(MyMixin(HTMLElement)) {
  classField;
  static observedAttributes = ['class-attr'];
  classMethod() {
    this.dispatchEvent(new Event('class-event'))
  }
}`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('03-mixin-variations', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import { dedupeMixin } from '@open-wc/dedupe-mixin';
import { BarMixin } from './bar-mixin.js';

export const ArrowFunctionMixin = klass => class extends klass {
  foo;
  static observedAttributes = [...super.observedAttributes, 'my-attribute'];
  method() {
    this.dispatchEvent(new Event('change'))
  }
}

export function FunctionDeclarationMixin(klass) {
  return class extends klass {}
}

export function ReturnValMixin(klass) {
  class Foo extends klass {}
  return Foo;
}

export const ReturnValArrowMixin = klass => {
  class Bar extends klass {}
  return Bar;
}

// \`InternalMixin\` is not exported, but \`InternalClass\` is still expected to have \`foo = 1\` documented in the CEM
export class InternalClass extends InternalMixin(HTMLElement){}

function InternalMixin(superClass){
    return class extends superClass {
       foo = 1;
    }
}

/**
 * @type {Element}
 * @param {string} klass
 */
const MixinImpl = klass => class extends BarMixin(klass) {}
export const ReexportedWrappedMixin = dedupeMixin(MixinImpl);
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('04-external', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.js': /* js */ `
import { MyMixin } from '@ext-scoped/with-export-map';
import { MyClass } from 'ext-pkg-without-export-map';
import { MyClassWithMyMixin } from 'ext-pkg-without-export-map';

export class MyElement extends MyMixin(MyClass) {
  constructor() {
    super();

    this.extClassProp = 'otherValueThanProp';
  }
}

export class MyElement2 extends MyClassWithMyMixin {
  constructor() {
    super();

    this.extMixinProp = 'otherValueThanProp';
  }
}
`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it.skip('05-external-in-monorepo', async () => {
        const actual = await generate(
            await createSourceFiles({
                './index.js': /* js */ `
import { MyMixin } from '@mono/sibling-pkg';
import { MyClass } from 'ext-pkg-without-export-map';
import { internalVar } from './internalFile.js';

export class MyElement extends MyMixin(MyClass) {
  constructor() {
    super();

    this.extClassProp = 'otherValueThanProp-' + internalVar;
  }
}
`,
                './internalFile.js': /* js */ `
// This file will be found by find-dependencies, and it should be filtered out in find-external-manifests
export const internalVar = 'internalVar';`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });
});
