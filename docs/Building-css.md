# Building CSS

Unless you are using syntaxes like Sass and Less, CSS builds are less expansive and intrusive than JavaScript ones, and generally have less impact in production environments. RNA does not provide plugins for extra transpiler by design, since modern and native CSS has enough features for solid web apps development. Anyway, CSS bundling can be useful for collecting and optimizing image and font assets or for adding support for legacy browser via autoprefixers.

## Setup

Even if [esbuild](https://esbuild.github.io/) has out of the box support for CSS files, in order to bundle a CSS module using RNA you may have to install the bundler package along with the Lightning CSS plugin:

```sh
$ npm i -D @chialab/rna @chialab/rna-bundler
$ yarn add -D @chialab/rna @chialab/rna-bundler
```

and run:

```sh
$ npx rna build src/index.css --output public/index.css
$ yarn rna build src/index.css --output public/index.css
```

A CSS bundle will be generated as well as its source map (unless you added the `--no-map` flag).

For production environments, you may want to minify output using the `--minify` flag.

## Assets

Every asset file referenced by `url()` statements will be copied to the destination path.

## Dependencies

The `@import` statements will recursively collect and transpile CSS files.  
You may also want to import CSS libraries like bootstap, materialize or normalize. RNA can bundle CSS modules installed as dependencies in the node_modules, both referring to single files or using the `style` field in the package.json.

```css
@import url('./path/to.css');       /* 🙂 */
@import url('path/to/vendor.css');  /* 😁 */
@import url('@css/my-css-lib');     /* 🤩 */
@import url('jquery');              /* 🤕 */
```

## Lightning CSS

[Lightning CSS](https://lightningcss.dev/) is postprocessor for style files. It parses CSS files and, using various plugins, can modify the AST and generate a brand new CSS file. It is widely used in the ecosystem thanks to its ability to convert modern syntax for legacy browsers, often using the autoprefixer plugin for beta features.


---

## Recommendations

### Stylelint

Although out of RNA scope, we strongly recommend to use a linter for CSS projects. Our preferred one is [Stylelint](https://stylelint.io/) that is built upon the PostCSS parser.  
First, you need to install the stylelint cli:

```sh
$ npm i -D stylelint
```

Please follow official guide for [linter configuration](https://stylelint.io/user-guide/configure).

We also provide our configuration preset:

```sh
$ npm i -D @chialab/stylelint-config
```

**.stylelintrc.json**

```json
{
    "extends": "@chialab/stylelint-config"
}
```

Also, do not forget to install the linter extension for your IDE:
* [VSCode](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
