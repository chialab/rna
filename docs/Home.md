**RNA** is a set of plugins for populare bundlers, servers and test runners. It can be used programmatically in your configuration or via the pluggable `rna` cli.

### 📦 Transpiling and bundling

TODO

### 🚀 Development server

TODO

### 🧭 Tests in the browser

TODO

### 🎛 Tests in Node

TODO

## Quick usage

```sh
$ npm i -D \
    @chialab/rna \
    @chialab/rna-bundler \
    @chialab/rna-dev-server \
    @chialab/rna-browser-test-runner
```

**package.json**
```json
{
    "scripts": {
        "start": "rna serve src --port 3000",
        "build": "rna build src/index.html --output public",
        "test": "rna test:browser 'test/**/*.spec'"
    }
}

