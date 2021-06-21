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

TODO

## Bundling for Node

TODO

## Dynamic import and code splitting

TODO

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

> 👉 See the **Recommendations** section for [JSDoc typechecking](#JSDoc-typechecking) and more [TypeScript usage tricks](#Type-imports).

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
...
```

**Output**

```javascript
const response = await fetch('/data.json');
...
```

The console statement will be removed because of dead code elimination. 

## Assets management

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
...
```

This kind of reference is natively supported by browser and Node. During the build, RNA will convert those references to esbuild's imports statements in order to correctly update the path for distribution files.

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

render(h('div', nullm, 'Hello world!'), document.body);
```

> 👉 See the **Recommendations** section for JSX alternatives using [Tagged Templates](#Tagged-templates).

## Targeting ES5

Even if modern JavaScript is supported by the majority of browsers, sometimes we have to still support legacy verisons such as Internet Explorer or old Safari releases. Since esbuild supports transpilation from the latest ECMA version to the ES6 version, a plugin is needed for lower transpilation.

RNA provides 2 plugins for this scopes. Both of them can be installed and are automatically loaded by the RNA cli if found in the node_modules.

### Babel

[Babel](https://babeljs.io/) is the most common solution for this scope:

```sh
$ npm i -D @chialab/esbuild-plugin-babel
$ yarn add -D @chialab/esbuild-plugin-babel
```

This will install Babel core packages, its [env preset](https://babeljs.io/docs/en/babel-preset-env) and an adapter for esbuild. You can configure the output using a [browserslist query](https://babeljs.io/docs/en/babel-preset-env#browserslist-integration) or specifying a Babel's [config file](https://babeljs.io/docs/en/config-files) in the root of your project.

### SWC

[Swc](https://swc.rs/) is a Babel alternative written in rust and way more performant. It is gaining large support by the community, but it does not have the Babel stability (yet). If you like risks and speed, you may want to install the swc plugin:

```sh
$ npm i -D @chialab/esbuild-plugin-swc
$ yarn add -D @chialab/esbuild-plugin-swc
```

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

**.eslintrc.json**

```jsonc
{
    "extends": [
        "@chialab/eslint-config/javascript"
        // "@chialab/eslint-config/typescript"
    ]
}
```

Also, do not forget to install the linter extension for your IDE:
* [VSCode](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)


### Tagged templates

TODO

### JSDoc typechecking

TODO

### Type imports

TODO
