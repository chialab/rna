# Building ESM and CJS modules

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

## TypeScript

TODO

## Targeting ES5

TODO

---

## Recommendations

### Eslint

### Tagged templates
