import { describe, expect, it } from 'vitest';
import { createSourceFiles, generate } from '../lib/index.js';

describe('03-module', () => {
    it('functionLike', async () => {
        const actual = await generate(
            await createSourceFiles({
                './my-element.ts': /* js */ `
/**
 * ARROW FUNCTIONS
 */

export const arrow1 = () => {}
export const arrow2 = (bar) => {}
export const arrow3 = (bar:string) => {}
export const arrow4 = (bar:string):boolean => {}
/**
 * @param {number} bar
 */
export const arrow5 = (bar:string):boolean => {}
/**
 * @param {number} bar
 * @return {string}
 */
export const arrow6 = (bar:string):boolean => {}


/**
 * FUNCTION DECLARATIONS
 */

export function functionDeclaration1(){}
export function functionDeclaration2(bar){}
export function functionDeclaration3(bar:string){}
export function functionDeclaration4(bar:string):boolean{}
/**
 * @param {number} bar
 */
export function functionDeclaration5(bar:string):boolean{}
/**
 * @param {number} bar
 * @return {string}
 */
export function functionDeclaration6(bar:string):boolean{}

export function emptyReturn() {
  return;
}

/**
 * METHODS
 */

export class MyEl {
  functionDeclaration1(){}
  functionDeclaration2(bar){}
  functionDeclaration3(bar:string){}
  functionDeclaration4(bar:string):boolean{}
  /**
   * @param {number} bar
   */
  functionDeclaration5(bar:string):boolean{}
  /**
   * @param {number} bar
   * @return {string}
   */
  functionDeclaration6(bar:string):boolean{}
}`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });

    it('variables', async () => {
        const actual = await generate(
            await createSourceFiles({
                './foo.js': /* js */ `
export const foo = 1;
`,
                './my-element.ts': /* ts */ `
let var1, var2, var3A, var4 = true;

const dontIncludeMe = false; // should not be in declarations

export { var1, var2 };
export { var3A as var3B, var4 };
export let var5, var6;
export let var7 = var6 = var5;
export function function1() {}
export class Class1 {}

// type inference
export const typeinferrence = '';
export const asConst = 'const' as const;
export const asConstRef = {foo:'bar'} as const;

export * as foo from "./foo.js";
export * as bar from "bar";`,
            })
        );

        expect(JSON.stringify(actual, null, 2)).toMatchSnapshot();
    });
});
