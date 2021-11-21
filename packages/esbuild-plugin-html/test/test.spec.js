import esbuild from 'esbuild';
import htmlPlugin from '@chialab/esbuild-plugin-html';
import { expect } from 'chai';

describe('esbuild-plugin-html', () => {
    it('should bundle webapp with scripts', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.iife.html', import.meta.url).pathname],
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

        expect(index.path.endsWith('/out/index.iife.html')).to.be.true;
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

        expect(js.path.endsWith('/out/iife/index.9aa1d192.iife.js')).to.be.true;
        expect(js.text).to.be.equal(`(() => {
  // fixture/lib.js
  var log = console.log.bind(console);

  // fixture/index.js
  window.addEventListener("load", () => {
    log("test");
  });
})();
`);

        expect(css.path.endsWith('/out/iife/index.9aa1d192.iife.css')).to.be.true;
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

        expect(index.path.endsWith('/out/index.esm.html')).to.be.true;
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

    it('should bundle webapp with styles', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.css.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, css] = outputFiles;

        expect(outputFiles).to.have.lengthOf(2);

        expect(index.path.endsWith('/out/index.css.html')).to.be.true;
        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="css/index.6c5009c1.css">
</head>

<body>
</body>

</html>`);

        expect(css.path.endsWith('/out/css/index.6c5009c1.css')).to.be.true;
        expect(css.text).to.be.equal(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}

/* fixture/index.6c5009c1.css */
body {
  color: red;
}
`);
    });

    it('should bundle webapp with png favicons', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.icons.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            assetNames: 'icons/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, ...icons] = outputFiles;

        expect(outputFiles).to.have.lengthOf(7);

        expect(index.path.endsWith('/out/index.icons.html')).to.be.true;
        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="icon" sizes="16x16" href="icons/favicon-16x16.png">
    <link rel="icon" sizes="32x32" href="icons/favicon-32x32.png">
    <link rel="icon" sizes="48x48" href="icons/favicon-48x48.png">
    <link rel="shortcut icon" href="icons/favicon-196x196.png">
    <link rel="icon" sizes="196x196" href="icons/favicon-196x196.png">
    <link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
    <link rel="apple-touch-icon" sizes="167x167" href="icons/apple-touch-icon-ipad.png">
</head>

<body>
</body>

</html>`);

        expect(icons[0].path.endsWith('/out/icons/favicon-16x16.png')).to.be.true;
        expect(icons[0].contents.byteLength).to.be.equal(459);

        expect(icons[3].path.endsWith('/out/icons/favicon-196x196.png')).to.be.true;
        expect(icons[3].contents.byteLength).to.be.equal(6366);
    });

    it('should bundle webapp with svg favicon', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.svgicons.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            assetNames: 'icons/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, icon] = outputFiles;

        expect(outputFiles).to.have.lengthOf(2);

        expect(index.path.endsWith('/out/index.svgicons.html')).to.be.true;
        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="shortcut icon" href="icons/icon.svg" type="image/svg+xml">
</head>

<body>
</body>

</html>`);

        expect(icon.path.endsWith('/out/icons/icon.svg')).to.be.true;
        expect(icon.contents.byteLength).to.be.equal(1475);
    });

    it('should bundle webapp with ios splashscreens', async function() {
        this.timeout(15000);

        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.screens.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            assetNames: 'screens/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, ...screens] = outputFiles;

        expect(outputFiles).to.have.lengthOf(8);

        expect(index.path.endsWith('/out/index.screens.html')).to.be.true;
        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="screens/apple-launch-iphonex.png">
    <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="screens/apple-launch-iphone8.png">
    <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" href="screens/apple-launch-iphone8-plus.png">
    <link rel="apple-touch-startup-image" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" href="screens/apple-launch-iphone5.png">
    <link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="screens/apple-launch-ipadair.png">
    <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" href="screens/apple-launch-ipadpro10.png">
    <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="screens/apple-launch-ipadpro12.png">
</head>

<body>
</body>

</html>`);

        expect(screens[0].path.endsWith('/out/screens/apple-launch-iphonex.png')).to.be.true;
        expect(screens[0].contents.byteLength).to.be.equal(21254);

        expect(screens[3].path.endsWith('/out/screens/apple-launch-iphone5.png')).to.be.true;
        expect(screens[3].contents.byteLength).to.be.equal(8536);
    });

    it('should bundle webapp with assets', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.assets.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            assetNames: 'assets/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, ...assets] = outputFiles;

        expect(outputFiles).to.have.lengthOf(3);

        expect(index.path.endsWith('/out/index.assets.html')).to.be.true;
        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="preload" href="assets/icon.svg">
</head>

<body>
    <img src="assets/icon.png" alt="">
</body>

</html>`);

        assets.sort((a1, a2) => a2.contents.byteLength - a1.contents.byteLength);

        expect(assets[0].path.endsWith('/out/assets/icon.png')).to.be.true;
        expect(assets[0].contents.byteLength).to.be.equal(20754);

        expect(assets[1].path.endsWith('/out/assets/icon.svg')).to.be.true;
        expect(assets[1].contents.byteLength).to.be.equal(1475);
    });

    it('should bundle webapp with a webmanifest', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: new URL('.', import.meta.url).pathname,
            entryPoints: [new URL('fixture/index.manifest.html', import.meta.url).pathname],
            sourceRoot: new URL('fixture', import.meta.url).pathname,
            assetNames: 'assets/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin(),
            ],
        });

        const [index, ...assets] = outputFiles;
        const icons = assets.slice(0, 9);
        const manifest = assets[assets.length - 1];

        expect(outputFiles).to.have.lengthOf(17);

        expect(index.path.endsWith('/out/index.manifest.html')).to.be.true;
        expect(index.text).to.be.equal(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Test">
    <title>Document</title>
    <link rel="icon" sizes="16x16" href="assets/favicon-16x16.png">
    <link rel="icon" sizes="32x32" href="assets/favicon-32x32.png">
    <link rel="icon" sizes="48x48" href="assets/favicon-48x48.png">
    <link rel="shortcut icon" href="assets/favicon-196x196.png">
    <link rel="icon" sizes="196x196" href="assets/favicon-196x196.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
    <link rel="apple-touch-icon" sizes="167x167" href="assets/apple-touch-icon-ipad.png">
    <link rel="manifest" href="assets/manifest.webmanifest">
</head>

<body>
</body>

</html>`);

        expect(icons).to.have.lengthOf(9);
        expect(icons[0].path.endsWith('/out/assets/android-chrome-36x36.png')).to.be.true;
        expect(icons[0].contents.byteLength).to.be.equal(1135);
        expect(icons[8].path.endsWith('/out/assets/android-chrome-512x512.png')).to.be.true;
        expect(icons[8].contents.byteLength).to.be.equal(24012);

        expect(manifest.path.endsWith('/out/assets/manifest.webmanifest')).to.be.true;
        expect(manifest.text).to.be.equal(`{
  "name": "Document",
  "short_name": "Document",
  "description": "Test",
  "start_url": "/",
  "scope": "",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#fff",
  "lang": "en",
  "icons": [
    {
      "src": "./assets/android-chrome-36x36.png?emit=file",
      "sizes": "36x36",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-48x48.png?emit=file",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-72x72.png?emit=file",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-96x96.png?emit=file",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-144x144.png?emit=file",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-192x192.png?emit=file",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-256x256.png?emit=file",
      "sizes": "256x256",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-384x384.png?emit=file",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "./assets/android-chrome-512x512.png?emit=file",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}`);
    });
});
