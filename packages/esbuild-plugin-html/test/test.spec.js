import path from 'path';
import { fileURLToPath } from 'url';
import virtualPlugin from '@chialab/esbuild-plugin-virtual';
import chaiString from 'chai-string';
import esbuild from 'esbuild';
import { chai, describe, expect, test } from 'vitest';
import htmlPlugin from '../lib/index.js';

chai.use(chaiString);

describe('esbuild-plugin-html', () => {
    test('should bundle webapp with scripts', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, js, css] = outputFiles;

        expect(outputFiles).toHaveLength(3);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.iife.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="application/javascript">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('index-UMVLUHQU.css');
        }());
    </script>
</head>

<body>
    <script src="index-33TQGLB6.js" type="application/javascript"></script>
</body>

</html>`);

        expect(js.path).endsWith(path.join(path.sep, 'out', 'index-33TQGLB6.js'));
        expect(js.text).toBe(`"use strict";
(() => {
  // fixture/lib.js
  var log = console.log.bind(console);

  // fixture/index.js
  window.addEventListener("load", () => {
    log("test");
  });
})();
`);

        expect(css.path).endsWith(path.join(path.sep, 'out', 'index-UMVLUHQU.css'));
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    test('should bundle webapp with scripts injecting links', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin({
                    injectStylesAs: 'link',
                }),
            ],
        });

        const [index, js, css] = outputFiles;

        expect(outputFiles).toHaveLength(3);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.iife.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="index-UMVLUHQU.css">
</head>

<body>
    <script src="index-33TQGLB6.js" type="application/javascript"></script>
</body>

</html>`);

        expect(js.path).endsWith(path.join(path.sep, 'out', 'index-33TQGLB6.js'));
        expect(js.text).toBe(`"use strict";
(() => {
  // fixture/lib.js
  var log = console.log.bind(console);

  // fixture/index.js
  window.addEventListener("load", () => {
    log("test");
  });
})();
`);

        expect(css.path).endsWith(path.join(path.sep, 'out', 'index-UMVLUHQU.css'));
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    test('should bundle webapp with scripts using public path', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, js, css] = outputFiles;

        expect(outputFiles).toHaveLength(3);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.iife.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="application/javascript">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('/public/index-P4RCWXU5.css');
        }());
    </script>
</head>

<body>
    <script src="/public/index-BBP6457K.js" type="application/javascript"></script>
</body>

</html>`);

        expect(js.path).endsWith(path.join(path.sep, 'out', 'index-BBP6457K.js'));
        expect(js.text).toBe(`"use strict";
(() => {
  // fixture/lib.js
  var log = console.log.bind(console);

  // fixture/index.js
  window.addEventListener("load", () => {
    log("test");
  });
})();
`);

        expect(css.path).endsWith(path.join(path.sep, 'out', 'index-P4RCWXU5.css'));
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    test('should bundle webapp with scripts and sourcemaps', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            sourcemap: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, , js, , css] = outputFiles;

        expect(outputFiles).toHaveLength(5);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.iife.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="application/javascript">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('index-LET4DQVG.css');
        }());
    </script>
</head>

<body>
    <script src="index-4YXF7HZB.js" type="application/javascript"></script>
</body>

</html>`);

        expect(js.path).endsWith(path.join(path.sep, 'out', 'index-4YXF7HZB.js'));
        expect(js.text).toBe(`"use strict";
(() => {
  // fixture/lib.js
  var log = console.log.bind(console);

  // fixture/index.js
  window.addEventListener("load", () => {
    log("test");
  });
})();
//# sourceMappingURL=index-4YXF7HZB.js.map
`);

        expect(css.path).endsWith(path.join(path.sep, 'out', 'index-LET4DQVG.css'));
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
/*# sourceMappingURL=index-LET4DQVG.css.map */
`);
    });

    test('should bundle webapp with modules', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.esm.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...files] = outputFiles;
        const jsFile = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', 'index')) && file.path.endsWith('.js')
        );
        const jsSource = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', '1-')) && file.path.endsWith('.js')
        );
        const jsChunk = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', 'chunk-')) && file.path.endsWith('.js')
        );
        const css = files.find((file) => file.path.endsWith('.css'));

        expect(outputFiles).toHaveLength(5);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.esm.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="module">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('index-UMVLUHQU.css');
        }());
    </script>
</head>

<body>
    <script src="index-QZA3NNDV.js" type="module"></script>
    <script type="module">
        import './1-ZOQZ7JHL.js'
    </script>
</body>

</html>`);

        expect(path.basename(jsFile.path)).endsWith('index-QZA3NNDV.js');
        expect(jsFile.text).toBe(`import {
  log
} from "./chunk-VLQWHBZB.js";

// fixture/index.js
window.addEventListener("load", () => {
  log("test");
});
`);

        expect(path.basename(jsSource.path)).endsWith('1-ZOQZ7JHL.js');
        expect(jsSource.text).toBe(`import {
  log
} from "./chunk-VLQWHBZB.js";

// fixture/1.js
log("test");
`);

        expect(path.basename(jsChunk.path)).endsWith('chunk-VLQWHBZB.js');
        expect(jsChunk.text).toBe(`// fixture/lib.js
var log = console.log.bind(console);

export {
  log
};
`);

        expect(path.basename(css.path)).endsWith('index-UMVLUHQU.css');
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    test('should bundle webapp with modules using public path', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.esm.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...files] = outputFiles;
        const jsFile = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', 'index')) && file.path.endsWith('.js')
        );
        const jsSource = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', '1-')) && file.path.endsWith('.js')
        );
        const jsChunk = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', 'chunk-')) && file.path.endsWith('.js')
        );
        const css = files.find((file) => file.path.endsWith('.css'));

        expect(outputFiles).toHaveLength(5);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.esm.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="module">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('/public/index-P4RCWXU5.css');
        }());
    </script>
</head>

<body>
    <script src="/public/index-2K4C7RE6.js" type="module"></script>
    <script type="module">
        import '/public/1-P72MDYYG.js'
    </script>
</body>

</html>`);

        expect(path.basename(jsFile.path)).endsWith('index-2K4C7RE6.js');
        expect(jsFile.text).toBe(`import {
  log
} from "/public/chunk-NGMCFQ6Z.js";

// fixture/index.js
window.addEventListener("load", () => {
  log("test");
});
`);

        expect(path.basename(jsSource.path)).endsWith('1-P72MDYYG.js');
        expect(jsSource.text).toBe(`import {
  log
} from "/public/chunk-NGMCFQ6Z.js";

// fixture/1.js
log("test");
`);

        expect(path.basename(jsChunk.path)).endsWith('chunk-NGMCFQ6Z.js');
        expect(jsChunk.text).toBe(`// fixture/lib.js
var log = console.log.bind(console);

export {
  log
};
`);

        expect(path.basename(css.path)).endsWith('index-P4RCWXU5.css');
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    test('should bundle webapp with modules and chunks', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.chunks.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            splitting: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...files] = outputFiles;
        const jsFile = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', 'index')) && file.path.endsWith('.js')
        );
        const jsSource = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', '1-')) && file.path.endsWith('.js')
        );
        const jsLib = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', 'lib-')) && file.path.endsWith('.js')
        );
        const jsChunk = files.find(
            (file) => file.path.includes(path.join(path.sep, 'out', 'chunk-')) && file.path.endsWith('.js')
        );
        const css = files.find((file) => file.path.endsWith('.css'));

        expect(outputFiles).toHaveLength(6);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.chunks.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="module">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('index-UMVLUHQU.css');
        }());
    </script>
</head>

<body>
    <script type="module">
        import './1-GWHRC5DW.js'
    </script>
    <script src="index-5DEJB2KF.js" type="module"></script>
</body>

</html>`);

        expect(path.basename(jsFile.path)).endsWith('index-5DEJB2KF.js');
        expect(jsFile.text).toBe(`import {
  log
} from "./chunk-GNFD7QL2.js";

// fixture/index.js
window.addEventListener("load", () => {
  log("test");
});
`);

        expect(path.basename(jsSource.path)).endsWith('1-GWHRC5DW.js');
        expect(jsSource.text).toBe(`// fixture/1.js
import("./lib-476DRX7L.js").then(({ log }) => {
  log("test");
});
`);

        expect(path.basename(jsLib.path)).endsWith('lib-476DRX7L.js');
        expect(jsLib.text).toBe(`import {
  log
} from "./chunk-GNFD7QL2.js";
export {
  log
};
`);

        expect(path.basename(jsChunk.path)).endsWith('chunk-GNFD7QL2.js');
        expect(jsChunk.text).toBe(`// fixture/lib.js
var log = console.log.bind(console);

export {
  log
};
`);

        expect(path.basename(css.path)).endsWith('index-UMVLUHQU.css');
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    test('should bundle webapp with modules and scripts', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.mixed.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const index = /** @type {import('esbuild').OutputFile} */ (
            outputFiles.find((file) => file.path.endsWith('.html'))
        );
        const iife = /** @type {import('esbuild').OutputFile} */ (
            outputFiles.find((file) => file.path.endsWith('index-33TQGLB6.js'))
        );
        const esm = /** @type {import('esbuild').OutputFile} */ (
            outputFiles.find((file) => file.path.endsWith('index-NG6KDBQ4.js'))
        );
        const css = /** @type {import('esbuild').OutputFile} */ (
            outputFiles.find((file) => file.path.endsWith('index-UMVLUHQU.css'))
        );

        expect(outputFiles).toHaveLength(5);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.mixed.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="module">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('index-UMVLUHQU.css');
        }());
    </script>
    <script nomodule="" type="application/javascript">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('index-UMVLUHQU.css');
        }());
    </script>
</head>

<body>
    <script src="index-NG6KDBQ4.js" type="module"></script>
    <script src="index-33TQGLB6.js" type="application/javascript" nomodule=""></script>
</body>

</html>`);

        expect(iife.path).endsWith(path.join(path.sep, 'out', 'index-33TQGLB6.js'));
        expect(iife.text).toBe(`"use strict";
(() => {
  // fixture/lib.js
  var log = console.log.bind(console);

  // fixture/index.js
  window.addEventListener("load", () => {
    log("test");
  });
})();
`);

        expect(esm.path).endsWith(path.join(path.sep, 'out', 'index-NG6KDBQ4.js'));
        expect(esm.text).toBe(`// fixture/lib.js
var log = console.log.bind(console);

// fixture/index.js
window.addEventListener("load", () => {
  log("test");
});
`);

        expect(css.path).endsWith(path.join(path.sep, 'out', 'index-UMVLUHQU.css'));
        expect(css.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);
    });

    test('should bundle webapp with styles', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.css.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...cssFiles] = outputFiles;
        const cssFile = cssFiles.find((output) => output.path.includes(path.join(path.sep, 'out', 'index')));
        const cssSource = cssFiles.find((output) => output.path.includes(path.join(path.sep, 'out', '1-')));

        expect(outputFiles).toHaveLength(3);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.css.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="index-UMVLUHQU.css">
    <style>
        @import '1-EKADEBHI.css'
    </style>
    <!-- Empty style tag -->
    <style></style>
</head>

<body>
</body>

</html>`);

        expect(cssFile.path).endsWith(path.join(path.sep, 'out', 'index-UMVLUHQU.css'));
        expect(cssFile.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);

        expect(cssSource.path).endsWith(path.join(path.sep, 'out', '1-EKADEBHI.css'));
        expect(cssSource.text).toBe(`/* fixture/1.css */
body {
  color: red;
}
`);
    });

    test('should bundle webapp with styles using public path', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.css.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...cssFiles] = outputFiles;
        const cssFile = cssFiles.find((output) => output.path.includes(path.join(path.sep, 'out', 'index')));
        const cssSource = cssFiles.find((output) => output.path.includes(path.join(path.sep, 'out', '1-')));

        expect(outputFiles).toHaveLength(3);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.css.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="/public/index-P4RCWXU5.css">
    <style>
        @import '/public/1-VXBR4AUQ.css'
    </style>
    <!-- Empty style tag -->
    <style></style>
</head>

<body>
</body>

</html>`);

        expect(cssFile.path).endsWith(path.join(path.sep, 'out', 'index-P4RCWXU5.css'));
        expect(cssFile.text).toBe(`/* fixture/index.css */
html,
body {
  margin: 0;
  padding: 0;
}
`);

        expect(cssSource.path).endsWith(path.join(path.sep, 'out', '1-VXBR4AUQ.css'));
        expect(cssSource.text).toBe(`/* fixture/1.css */
body {
  color: red;
}
`);
    });

    test('should bundle webapp with virtual styles', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('./index.html', import.meta.url))],
            sourceRoot: fileURLToPath(new URL('.', import.meta.url)),
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            bundle: true,
            write: false,
            plugins: [
                virtualPlugin([
                    {
                        path: fileURLToPath(new URL('./index.html', import.meta.url)),
                        contents: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="index.css">
</head>
<body>

</body>
</html>
`,
                    },
                    {
                        path: 'index.css',
                        contents: "@import 'lib.css';",
                        loader: 'css',
                    },
                    {
                        path: 'lib.css',
                        contents: 'html { padding: 0; }',
                        loader: 'css',
                    },
                ]),
                htmlPlugin(),
            ],
        });

        const [index, css] = outputFiles;

        expect(outputFiles).toHaveLength(2);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="index-JHCCFNW4.css">
</head>

<body>
</body>

</html>`);

        expect(css.path).endsWith(path.join(path.sep, 'out', 'index-JHCCFNW4.css'));
        expect(css.text).toBe(`/* lib.css */
html {
  padding: 0;
}

/* index.css */
`);
    });

    test('should bundle webapp with png favicons', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.icons.html', import.meta.url))],
            sourceRoot: '/',
            assetNames: 'icons/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...icons] = outputFiles;

        expect(outputFiles).toHaveLength(7);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.icons.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
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

        expect(icons[0].path).endsWith(path.join(path.sep, 'out', 'icons', 'favicon-16x16.png'));
        expect(icons[0].contents.byteLength).toBe(459);

        expect(icons[3].path).endsWith(path.join(path.sep, 'out', 'icons', 'favicon-196x196.png'));
        expect(icons[3].contents.byteLength).toBe(6366);
    });

    test('should bundle webapp with png favicons using public path', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.icons.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            assetNames: 'icons/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...icons] = outputFiles;

        expect(outputFiles).toHaveLength(7);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.icons.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="icon" sizes="16x16" href="/public/icons/favicon-16x16.png">
    <link rel="icon" sizes="32x32" href="/public/icons/favicon-32x32.png">
    <link rel="icon" sizes="48x48" href="/public/icons/favicon-48x48.png">
    <link rel="shortcut icon" href="/public/icons/favicon-196x196.png">
    <link rel="icon" sizes="196x196" href="/public/icons/favicon-196x196.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/public/icons/apple-touch-icon.png">
    <link rel="apple-touch-icon" sizes="167x167" href="/public/icons/apple-touch-icon-ipad.png">
</head>

<body>
</body>

</html>`);

        expect(icons[0].path).endsWith(path.join(path.sep, 'out', 'icons', 'favicon-16x16.png'));
        expect(icons[0].contents.byteLength).toBe(459);

        expect(icons[3].path).endsWith(path.join(path.sep, 'out', 'icons', 'favicon-196x196.png'));
        expect(icons[3].contents.byteLength).toBe(6366);
    });

    test('should bundle webapp with svg favicon', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.svgicons.html', import.meta.url))],
            sourceRoot: '/',
            assetNames: 'icons/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, icon] = outputFiles;

        expect(outputFiles).toHaveLength(2);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.svgicons.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
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

        expect(icon.path).endsWith(path.join(path.sep, 'out', 'icons', 'icon.svg'));
        expect(icon.contents.byteLength).toBe(1475);
    });

    test(
        'should bundle webapp with ios splashscreens',
        async () => {
            const { outputFiles } = await esbuild.build({
                absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
                entryPoints: [fileURLToPath(new URL('fixture/index.screens.html', import.meta.url))],
                sourceRoot: '/',
                assetNames: 'screens/[name]',
                outdir: 'out',
                format: 'esm',
                bundle: true,
                write: false,
                plugins: [htmlPlugin()],
            });

            const [index, ...screens] = outputFiles;

            expect(outputFiles).toHaveLength(8);

            expect(index.path).endsWith(path.join(path.sep, 'out', 'index.screens.html'));
            expect(index.text).toBe(`<!DOCTYPE html>
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

            expect(screens[0].path).endsWith(path.join(path.sep, 'out', 'screens', 'apple-launch-iphonex.png'));
            expect(screens[0].contents.byteLength).toBe(21254);

            expect(screens[3].path).endsWith(path.join(path.sep, 'out', 'screens', 'apple-launch-iphone5.png'));
            expect(screens[3].contents.byteLength).toBe(8536);
        },
        {
            timeout: 20_000,
        }
    );

    test('should bundle webapp with assets', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.assets.html', import.meta.url))],
            sourceRoot: '/',
            assetNames: 'assets/[dir]/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...assets] = outputFiles;

        expect(outputFiles).toHaveLength(3);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.assets.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="preload" href="assets/icon.svg">
</head>

<body>
    <img src="assets/img/icon.png" alt="">
</body>

</html>`);

        assets.sort((a1, a2) => a2.contents.byteLength - a1.contents.byteLength);

        expect(assets[0].path).endsWith(path.join(path.sep, 'out', 'assets', 'img', 'icon.png'));
        expect(assets[0].contents.byteLength).toBe(20754);

        expect(assets[1].path).endsWith(path.join(path.sep, 'out', 'assets', 'icon.svg'));
        expect(assets[1].contents.byteLength).toBe(1475);
    });

    test('should bundle webapp with assets using public path', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.assets.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            assetNames: 'assets/[dir]/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...assets] = outputFiles;

        expect(outputFiles).toHaveLength(3);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.assets.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="preload" href="/public/assets/icon.svg">
</head>

<body>
    <img src="/public/assets/img/icon.png" alt="">
</body>

</html>`);

        assets.sort((a1, a2) => a2.contents.byteLength - a1.contents.byteLength);

        expect(assets[0].path).endsWith(path.join(path.sep, 'out', 'assets', 'img', 'icon.png'));
        expect(assets[0].contents.byteLength).toBe(20754);

        expect(assets[1].path).endsWith(path.join(path.sep, 'out', 'assets', 'icon.svg'));
        expect(assets[1].contents.byteLength).toBe(1475);
    });

    test('should bundle webapp with a webmanifest', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.manifest.html', import.meta.url))],
            sourceRoot: '/',
            assetNames: 'assets/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...assets] = outputFiles;
        const icons = assets.slice(0, 9);
        const manifest = assets[9];

        expect(outputFiles).toHaveLength(17);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.manifest.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
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

        expect(icons).toHaveLength(9);
        expect(icons[0].path).endsWith(path.join(path.sep, 'out', 'assets', 'android-chrome-36x36.png'));
        expect(icons[0].contents.byteLength).toBe(1135);
        expect(icons[8].path).endsWith(path.join(path.sep, 'out', 'assets', 'android-chrome-512x512.png'));
        expect(icons[8].contents.byteLength).toBe(24012);

        expect(manifest.path).endsWith(path.join(path.sep, 'out', 'assets', 'manifest.webmanifest'));
        expect(manifest.text).toBe(`{
  "name": "Document",
  "short_name": "Document",
  "description": "Test",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#fff",
  "lang": "en",
  "icons": [
    {
      "src": "android-chrome-36x36.png",
      "sizes": "36x36",
      "type": "image/png"
    },
    {
      "src": "android-chrome-48x48.png",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "android-chrome-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "android-chrome-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "android-chrome-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "android-chrome-256x256.png",
      "sizes": "256x256",
      "type": "image/png"
    },
    {
      "src": "android-chrome-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}`);
    });

    test('should bundle webapp with [dir] and outbase', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            outbase: fileURLToPath(new URL('./', import.meta.url)),
            entryNames: '[dir]/[name]',
            chunkNames: '[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...files] = outputFiles;
        const js = files.find((file) => file.path.endsWith('.js'));
        const css = files.find((file) => file.path.endsWith('.css'));

        expect(outputFiles).toHaveLength(3);
        expect(index.path).endsWith(path.join(path.sep, 'out', 'fixture', 'index.iife.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="application/javascript">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('../index.css');
        }());
    </script>
</head>

<body>
    <script src="../index.js" type="application/javascript"></script>
</body>

</html>`);

        expect(js.path).endsWith(path.join(path.sep, 'out', 'index.js'));
        expect(css.path).endsWith(path.join(path.sep, 'out', 'index.css'));
    });

    test('should bundle webapp with [dir] without outbase', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            entryNames: '[dir]/[name]',
            chunkNames: '[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...files] = outputFiles;
        const js = files.find((file) => file.path.endsWith('.js'));
        const css = files.find((file) => file.path.endsWith('.css'));

        expect(outputFiles).toHaveLength(3);
        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.iife.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="application/javascript">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('index.css');
        }());
    </script>
</head>

<body>
    <script src="index.js" type="application/javascript"></script>
</body>

</html>`);

        expect(js.path).endsWith(path.join(path.sep, 'out', 'index.js'));
        expect(css.path).endsWith(path.join(path.sep, 'out', 'index.css'));
    });

    test('should bundle webapp with [dir] without outbase using public path', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            entryNames: '[dir]/[name]',
            chunkNames: '[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index, ...files] = outputFiles;
        const js = files.find((file) => file.path.endsWith('.js'));
        const css = files.find((file) => file.path.endsWith('.css'));

        expect(outputFiles).toHaveLength(3);
        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.iife.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script type="application/javascript">
        (function() {
            function loadStyle(url) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = url;
                document.head.appendChild(l);
            }
            loadStyle('/public/index.css');
        }());
    </script>
</head>

<body>
    <script src="/public/index.js" type="application/javascript"></script>
</body>

</html>`);

        expect(js.path).endsWith(path.join(path.sep, 'out', 'index.js'));
        expect(css.path).endsWith(path.join(path.sep, 'out', 'index.css'));
    });

    test('should minify html', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            entryNames: '[dir]/[name]',
            chunkNames: '[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            minify: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index] = outputFiles;
        expect(index.text)
            .toBe(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document</title><script type="application/javascript">(function() {
function loadStyle(url) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = url;
    document.head.appendChild(l);
}
loadStyle('/public/index.css');
}());</script></head><body> <script src="/public/index.js" type="application/javascript"></script> </body></html>`);
    });

    test('should minify html with minify option', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.iife.html', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            entryNames: '[dir]/[name]',
            chunkNames: '[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            minify: true,
            write: false,
            plugins: [
                htmlPlugin({
                    minifyOptions: {
                        removeAttributeQuotes: true,
                    },
                }),
            ],
        });

        const [index] = outputFiles;
        expect(index.text)
            .toBe(`<!DOCTYPE html><html lang=en><head><meta charset=utf-8><meta http-equiv=X-UA-Compatible content="IE=edge"><meta name=viewport content="width=device-width, initial-scale=1.0"><title>Document</title><script type=application/javascript>(function() {
function loadStyle(url) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = url;
    document.head.appendChild(l);
}
loadStyle('/public/index.css');
}());</script></head><body> <script src=/public/index.js type=application/javascript></script> </body></html>`);
    });

    test('should interop with other html preprocessors', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.icons.hbs', import.meta.url))],
            sourceRoot: '/',
            publicPath: '/public',
            assetNames: 'icons/[name]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [
                htmlPlugin({
                    extensions: ['.html', '.hbs'],
                    async preprocess(contents) {
                        const { compile } = await import('handlebars');
                        const template = compile(contents);
                        return template({
                            iconPath: 'img/icon.png',
                        });
                    },
                }),
            ],
        });

        const [index, ...icons] = outputFiles;

        expect(outputFiles).toHaveLength(7);

        expect(index.path).endsWith(path.join(path.sep, 'out', 'index.icons.html'));
        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="icon" sizes="16x16" href="/public/icons/favicon-16x16.png">
    <link rel="icon" sizes="32x32" href="/public/icons/favicon-32x32.png">
    <link rel="icon" sizes="48x48" href="/public/icons/favicon-48x48.png">
    <link rel="shortcut icon" href="/public/icons/favicon-196x196.png">
    <link rel="icon" sizes="196x196" href="/public/icons/favicon-196x196.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/public/icons/apple-touch-icon.png">
    <link rel="apple-touch-icon" sizes="167x167" href="/public/icons/apple-touch-icon-ipad.png">
</head>

<body>
</body>

</html>`);

        expect(icons[0].path).endsWith(path.join(path.sep, 'out', 'icons', 'favicon-16x16.png'));
        expect(icons[0].contents.byteLength).toBe(459);

        expect(icons[3].path).endsWith(path.join(path.sep, 'out', 'icons', 'favicon-196x196.png'));
        expect(icons[3].contents.byteLength).toBe(6366);
    });

    test('should preserve spaces inside pre', async () => {
        const { outputFiles } = await esbuild.build({
            absWorkingDir: fileURLToPath(new URL('.', import.meta.url)),
            entryPoints: [fileURLToPath(new URL('fixture/index.formatting.html', import.meta.url))],
            sourceRoot: '/',
            chunkNames: '[name]-[hash]',
            outdir: 'out',
            format: 'esm',
            bundle: true,
            write: false,
            plugins: [htmlPlugin()],
        });

        const [index] = outputFiles;

        expect(index.text).toBe(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
    <pre>
            preserve whitespace

    </pre>
</body>

</html>`);
    });
});
