# Building CSS

Unless you are using syntaxes like Sass and Less, CSS builds are less expansive and intrusive than JavaScript ones, and generally have less impact in production environments. RNA does not provide plugins for extra transpiler by design, since modern and native CSS has enough features for solid web apps development. Anyway, CSS bundling can be useful for collecting and optimizing image and font assets or for adding support for legacy browser via autoprefixers.

## Setup

Even if [esbuild](https://esbuild.github.io/) has out of the box support for CSS files, in order to bundle a CSS module using RNA you may have to install the bundler package along with the postcss plugin for node modules resolution:

```sh
$ npm i -D @chialab/rna @chialab/rna-bundler @chialab/esbuild-plugin-postcss
$ yarn add -D @chialab/rna @chialab/rna-bundler @chialab/esbuild-plugin-postcss
```

and run:

```sh
$ npx rna build src/index.css --output public/index.css
$ yarn rna build src/index.css --output public/index.css
```

A CSS bundle will be generated as well as its source map (unless you added the `--no-map` flag). Every asset file referenced by `url()` statements will be copied to the destination path, while `@import` statements will recursively transpile and collect CSS files.  
You may also want to import CSS libraries like bootstap, materialize or normalize. RNA can bundle CSS modules installed as dependencies in the node_modules, both referring to single files or using the `style` field in the package.json.

```css
@import url('./path/to.css');              /* 🙂 */
@import url('vendor-css-lib/path/to.css'); /* 😁 */
@import url('@css/my-css-lib');            /* 🤩 */
@import url('jquery');                     /* 🤕 */
```

For production environments, you may want to minify output using the `--minify` flag.

## PostCSS

[PostCSS](https://postcss.org/) is postprocessor for style files. It parses CSS files and, using various plugins, can modify the AST and generate a brand new CSS file. It is widely used in the ecosystem thanks to its ability to convert modern syntax for legacy browsers, often using the autoprefixer plugin for beta features.

RNA already uses it to convert dependencies imports to relative references in order to collect them via esbuild. You can configure your build using a [PostCSS configuration](https://github.com/postcss/postcss-load-config) in your project and installing the plugins you need. RNA will automatically load it when required.

### Chialab PostCSS Preset

We built a [custom PostCSS preset](https://www.npmjs.com/package/@chialab/postcss-preset-chialab) with common rules we use in every project.  
You can install it using npm  or yarn:

```sh
$ npm i @chialab/postcss-preset-chialab -D
```

And creating or updating tghe postcss config file:

```json
{
  "plugins": {
    "@chialab/postcss-preset-chialab": {}
  }
}
```

---

## Recommendations

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
