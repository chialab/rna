# Building CSS

Unless you are using syntaxes like Sass and Less, CSS builds are less expansive and intrusive than JavaScript ones, and generally have less impact in production environments. RNA does not provide plugins for extra transpiler by design, since modern and native CSS has enough features for solid web apps development. Anyway, CSS bundling can be useful for collecting and optimizing image and font assets or for adding support for legacy browser via autoprefixers.

---

Since [esbuild](https://esbuild.github.io/) has out of the box support for CSS files, in order to bundle a CSS module using RNA you may have to install the bundler package only:

```sh
$ npm i -D @chialab/rna @chialab/rna-bundler
```

and run:

```sh
$ npx rna build src/index.css --output public/index.css
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
