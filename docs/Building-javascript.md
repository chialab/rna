# Building JavaScript modules

Transpiling and bundling JavaScript files has been the main cause of headaches in the JavaScript ecosystem for long time. Tools were necessarily complicated because they had to handle a lot of cases and very different environments.

Now, thanks to the wide support of modern features in browsers and the landing of ES modules in Node we can finally simplify tasks, configurations and workflows.

Using [esbuild](https://esbuild.github.io/) under the hood, RNA combines the fater JavaScript/TypeScript compiler out there with a bunch of plugins for assets management, env variables injection and JSX pragma auto import.

## Setup

In order to bundle a JS module using RNA you may have to install the bundler:

```sh
$ npm i -D @chialab/rna @chialab/rna-bundler
$ yarn add -D @chialab/rna @chialab/rna-bundler
```

and run:

```sh
$ npx rna build src/index.js --output public/index.js
$ yarn rna build src/index.js --output public/index.js
```

This will generate a ESM bundle at the `--output` destination. Using `--format` and `--platform` flags we can generate multiple bundles that targets both browser and Node environments.

## Bundling for the Web

The Web is the primary target of the RNA toolchain. Everything is optimized for light builds to serve over the network and to work natively in modern browsers. For this reasons, `esm` is the default output format and esbuild is configured to use the `browser` platform.  
So, the explicit command is equivalent to the previous run snippet:

```sh
$ npx rna build src/index.js --output public/index.js --format esm --platform browser
$ yarn rna build src/index.js --output public/index.js --format esm --platform browser
```

When targeting the browser platform, RNA will respect your `browser` configuration in the `package.json` in order to optimize the build for the requested environment.  
Using the `browser` field is optimal for modules that need to run in both browser and node environments:

**input**

```javascript
import jsdom from 'jsdom';

const document = typeof window !== undefined ? window.document : new jsdom.JSOM().window.document;
```

**package.json**

```json
{
    "browser": {
        "jsdom": false
    }
}
```

**output**

```javascript
const document = typeof window !== undefined ? window.document : undefined;
```

## Bundling for Node

Node is also a first class output. Specifying the `cjs` format, RNA will automatically target the `node` platform, converting every `import` statements to `require` invokations.

```sh
$ npx rna build src/index.js --output public/index.js --format cjs --platform node
$ yarn rna build src/index.js --output public/index.js --format cjs --platform node
```

**input**

```javascript
import jsdom from 'jsdom';

const document = typeof window !== undefined ? window.document : new jsdom.JSOM().window.document;
```

**output**

```javascript
const jsdom = require('jsdom');

const document = typeof window !== undefined ? window.document : new jsdom.JSOM().window.document;
```

Since even the LTS version of node supports ES modules, you may want to target node with the `esm` format:

```sh
$ npx rna build src/index.js --output public/index.js --format esm --platform node
$ yarn rna build src/index.js --output public/index.js --format esm --platform node
```

## Modules resolution

Esbuild supports both the old fashioned `main` fields as well the `exports` field using a Node-like resolution algorithm.  

### Using exports field

When a module defines conditions as follow in the package.json:

```json
{
    "type": "module",
    "exports": {
        "browser": "path/to/browser/index.js",
        "require": "path/to/cjs/index.cjs",
        "default": "path/to/esm/index.js"
    }
}
```

Esbuild will
* resolve to `exports.browser` if `--platform browser`
* resolve to `exports.require` if `--format cjs`
* resolve to `exports.default` otherwise

### Using main fields

When a module defines entrypoints as follow in the package.json:

```json
{
    "main": "path/to/cjs/index.js",
    "module": "path/to/esm/index.js",
    "browser": "path/to/browser/index.js"
}
```

Esbuild will
* resolve to `browser` if `--platform browser`
* resolve to `main` if `--format cjs`
* resolve to `module` if defined
* resolve to `main` otherwise

Read more about the [esbuild resolution algorithm](https://esbuild.github.io/api/#conditions) and [node specifications](https://nodejs.org/api/packages.html).

## Code splitting

Dynamic imports and URL assets can be used to split the code into multiple chunks that are loaded on demand. This is useful for loading pages on routing or for importing that large image manipulation library.

For example:

**app.js**

```js
import { route } from 'router';
import { render } from 'view';

route('/profile', async () => {
    const { Profile } = await import('./pages/Profile.js');
    render(Profile);
});
```

**Profile.js**

```js
import { render } from 'view';

export function Profile() {
    render('Hello world');
}
```

The build step of this app will generate 3 chunks:
* **vendors.js** that includes the `view` dependency
* **entrypoint.js** that imports **vendors.js** and includes `router` dependency and **app.js** source 
* **chunk.js** that imports **vendors.js** and includes **Profile.js** source 

## TypeScript

TypeScript syntax is supported out of the box from esbuild, also respecting your **tsconfig.json** file.  
**No supplementary plugin is required.**

However, please not that esbuild will only transpile your source without checking your code. For typechecking, you still need the vanilla `tsc` cli:

```sh
$ npm i -D typescript
$ yarn add -D typescript
```

You can run tsc with the `--noEmit` flag in order to execute typecheck only:

```sh
$ npx tsc --noEmit
$ yarn tsc --noEmit
```

<div class="note">

👉 See the **Recommendations** section for [JSDoc typechecking](#JSDoc-typechecking) and more [TypeScript usage tricks](#Type-imports).

</div>

## ENV variables

Many JavaScript modules uses process variables for both browser and Node environments. Expecially frameworks and web apps try to access the value of the `process.env.NODE_ENV` member in order to detect test or production environments. RNA comes with a plugin that automatically replaces the expression with the actual value.

```sh
$ NODE_ENV='production' npx rna build src/index.js --output public/index.js
```

**Input**

```javascript
const response = await fetch('/data.json');
if (process.env.NODE_ENV !== 'production') {
    console.log('DEBUG', response);
}
```

**Output**

```javascript
const response = await fetch('/data.json');
```

The console statement will be removed because of dead code elimination. 

## Assets

Generally, files are referenced in JavaScript scripts with non-standard inputs and ad hoc loaders:

```javascript
import IMAGE_URL from './assets/logo.png';
```

Since esbuild supports this common convention, RNA treats every unknown import as external file reference, delegating to esbuild assets collection and optimization.

Accordingly to its [concepts](./Concepts), RNA encourages and supports for assets referenced by standard `URL` instances:

```javascript
const IMAGE_URL = new URL('./assets/logo.png', import.meta.url).href;
const response = await fetch(IMAGE_URL);
const blob = await response.blob();
```

This kind of reference is natively supported by browser and Node. During the build, RNA will convert those references to esbuild's imports statements in order to correctly update the path for distribution files.

## Workers

In a vary similar way, RNA collects builds `new Worker()` reference along the main build:

```javascript
const worker = new Worker('./path/to/worker.js');
```

Please note that RNA does not generate a `Worker` class to instantiate like webpack does, but it will just correctly update the import reference. If you need a `Worker` class, you have to wrap it yourself:

```javascript
const workerClass = function() {
    return new Worker('./path/to/worker.js');
};
```

⚠️ At the moment the Worker plugin does not collect `importScript()` statements and does treat workers as modules, but we have plan to support the `{ type: "module" }` option in the near future.

## JSX

Although JSX is not part of EcmaScript standards, it is largerly used by many projects and the benifits it brings are real, even if [you may not need it](#Tagged-templates).  
Esbuild supports JSX transpilation, so RNA does it too. A plugin for auto importing the JSX pragma from a module is also available with the bundler.

```sh
$ npx rna build src/index.js --output public/index.js --jsxFactory h --jsxFragment Fragment --jsxModule '@chialab/dna'
```

**Input**

```javascript
import { render } from '@chialab/dna';

render(<div>Hello world!</div>, document.body);
```

**Output**

```javascript
import { render, h } from '@chialab/dna';

render(h('div', null, 'Hello world!'), document.body);
```

<div class="note">

👉 See the **Recommendations** section for JSX alternatives using [Tagged Templates](#Tagged-templates).

</div>

## Targeting ES5

Even if modern JavaScript is supported by the majority of browsers, sometimes we have to still support legacy verisons such as Internet Explorer or old Safari releases. Since esbuild supports transpilation from the latest ECMA version to the ES6 version, a plugin is needed for lower transpilation.

RNA provides a [Babel](https://babeljs.io/) plugin for this scopes. Once installed, it is automatically loaded by the RNA cli.

```sh
$ npm i -D @chialab/esbuild-plugin-babel
$ yarn add -D @chialab/esbuild-plugin-babel
```

This will install Babel core packages, its [env preset](https://babeljs.io/docs/en/babel-preset-env) and an adapter for esbuild. You can configure the output using a [browserslist query](https://babeljs.io/docs/en/babel-preset-env#browserslist-integration) or specifying a Babel's [config file](https://babeljs.io/docs/en/config-files) in the root of your project.

---

## Recommendations

Here's a list of authors' reccomendations for your project setup. Some of those hints are out of the scope of RNA itself, but they are foundamental for JavaScript development.

### Eslint

Eslint is the most common linter for JavaScript. It is pluggable with parsers and custom rules and there is great community support.  
First, you need to install the eslint cli:

```sh
$ npm i -D eslint
```

Please follow official guide for [linter configuration](https://eslint.org/docs/user-guide/configuring/).

We also provide our configuration preset:

```sh
$ npm i -D @chialab/eslint-config
```

**.eslintrc.json for JavaScript projects**

```json
{
    "extends": [
        "@chialab/eslint-config/javascript"
    ]
}
```

**.eslintrc.json for TypeScript projects**

```json
{
    "extends": [
        "@chialab/eslint-config/typescript"
    ]
}
```

Also, do not forget to install the linter extension for your IDE:
* [VSCode](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

### Tagged templates

Template Strings came with ES2015. They can be used to interpolate texts but also to execute more complex string manipulation using a "tag":

```js
return tag`Hello ${name || 'world'}!`;
```

Since then, a lot of libraries, such as `lit-html` and `uhtml`, have been released to generate views using Tagged Templates.  
Tagged Templates are similar to JSX: they have typings support, colorized syntax, autocomplete, hints and more but they are 100% standard JavaScript, so they don't need a transpilation step before landing the browser.

Furthermore, the [htm](https://github.com/developit/htm) module can be used to bring Tagged Templates support to those libraries that export the JSX pragma only:

```js
import React from 'react';
import ReactDOM from 'react-dom';
import htm from 'htm';

const html = htm.bind(React.createElement);
ReactDOM.render(html`<a href="/">Hello!</a>`, document.body);
```

### JSDoc typechecking

You don't need TypeScipt to typecheck JavaScript, or better to say, you can use the `typescript` module to check JavaScript syntax without using its syntax.  
Since version 4, TypeScript improved JSDoc support and its compiler can now check JavaScript sources as well as generate `.d.ts` declarations.

**tsconfig.json**

```json
{
    "compilerOptions": {
        "allowJs": true,
        "checkJs": true
    },
    "include": [
        "src/**/*.ts",
        "src/**/*.js"
    ]
}
```

**index.ts**

```typescript
function sum(a: number, b: number) {
    return a + b;
}
```

**index.js** (equivalent)

```js
/**
 * @param {number} a
 * @param {number} b
 */
function sum(a, b) {
    return a + b;
}
```

The pros of this solution is that you can skip the transpilation step if you are using standard JavaScript while still performing a typecheck, the cons are a more verbose syntax and the lack of TypeScript features such as decorators.

### Type imports

During the build step, esbuild removes type references and it is smart enough to detect side effects imports, but sometimes circular dependencies can cause imports order and dead code elimination issues.

Since version 4, TypeScript introduced the `import type` statement that instructs the bundlers how a reference is used.  
It is recommended to use this feature to import interfaces, types and references used as type only.

For example:

**Parent.js**

```typescript
import { Child } from './Child';

export class Parent {
    children: Child[] = [];

    addChild(name: string) {
        this.children.push(new Child(name, this));
    }
}
```

**Child.js**

```typescript
import type { Parent } from './Parent';

export class Child {
    name: string;
    parent: Parent;

    constructor(name: string, parent: Parent) {
        this.name = name;
        this.parent = parent;
    }
}
```
