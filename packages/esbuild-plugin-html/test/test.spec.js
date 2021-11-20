import esbuild from 'esbuild';
import htmlPlugin from '@chialab/esbuild-plugin-html';
import { expect } from 'chai';

describe('esbuild-plugin-html', () => {
    it('should bundle webapp with scripts', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.umd.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, js, css] = outputFiles;

        expect(outputFiles).to.have.lengthOf(3);

        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="iife/index.9aa1d192.iife.css">
</head>

<body>
    <script src="iife/index.9aa1d192.iife.js" type="module"></script>
</body>

</html>`);

        expect(js.path.endsWith('/iife/index.9aa1d192.iife.js')).to.be.true;
        expect(js.text).to.be.equal(`(() => {
  // fixture/lib.js
  var log = console.log.bind(console);

  // fixture/index.js
  window.addEventListener("load", () => {
    log("test");
  });
})();
`);

        expect(css.path.endsWith('/iife/index.9aa1d192.iife.css')).to.be.true;
        expect(css.text).to.be.equal(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    it('should bundle webapp with modules', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.esm.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, js, css] = outputFiles;

        expect(outputFiles).to.have.lengthOf(3);

        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="esm/index.4887cfb0.esm.css">
</head>

<body>
    <script src="esm/index.4887cfb0.esm.js" type="module"></script>
</body>

</html>`);

        expect(js.path.endsWith('/esm/index.4887cfb0.esm.js')).to.be.true;
        expect(js.text).to.be.equal(`// fixture/lib.js
var log = console.log.bind(console);

// fixture/index.js
window.addEventListener("load", () => {
  log("test");
});

// fixture/index.4887cfb0.esm.js
log("test");
`);

        expect(css.path.endsWith('/esm/index.4887cfb0.esm.css')).to.be.true;
        expect(css.text).to.be.equal(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });
});
