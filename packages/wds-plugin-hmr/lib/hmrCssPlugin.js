import { getRequestFilePath } from '@chialab/es-dev-server';

/**
 * @typedef {Object} CSSResource
 * @property {string} url
 * @property {string[]} dependencies
 * @property {string[]} dependants
 */

/**
 * @param {Map<string, CSSResource>} dependencyTree
 * @param {string} filePath
 * @param {string} url
 * @returns {CSSResource}
 */
function ensureResource(dependencyTree, filePath, url) {
    if (!dependencyTree.has(filePath)) {
        dependencyTree.set(filePath, {
            url,
            dependencies: [],
            dependants: [],
        });
    }

    return /** @type {CSSResource} */ (dependencyTree.get(filePath));
}

/**
 * @param {Map<string, CSSResource>} dependencyTree
 * @param {string} filePath
 * @returns {CSSResource[]}
 */
function invalidateResource(dependencyTree, filePath) {
    const resource = dependencyTree.get(filePath);
    if (!resource) {
        return [];
    }

    resource.dependencies.forEach((dependency) => {
        const dependencyResource = dependencyTree.get(dependency);
        if (!dependencyResource) {
            return;
        }

        dependencyResource.dependants.splice(dependencyResource.dependants.indexOf(filePath), 1);
        invalidateResource(dependencyTree, dependency);
    });

    if (!resource.dependants.length) {
        dependencyTree.delete(filePath);
        return [resource];
    }

    return resource.dependants.reduce(
        (acc, dependant) => {
            acc.push(...invalidateResource(dependencyTree, dependant));
            return acc;
        },
        /** @type {CSSResource[]} */ ([])
    );
}

function createCssLiveReload() {
    return `export default function(entrypoints) {
    entrypoints.forEach(function(entrypoint) {
        const url = new URL(entrypoint);
        const links = Array.from(document.querySelectorAll('link'))
            .filter(function(elem) {
                const link = new URL(elem.href);
                return link.origin === url.origin && link.pathname === url.pathname;
            });
        if (links.length) {
            url.searchParams.set('ts', Date.now());
            for (let i = 0; i < links.length; i++) {
                links[i].setAttribute('href', url.href);
            }
        }
    })
}`.replace(/\n\s*/g, '');
}

/**
 * Create a server plugin for CSS hmr.
 * @returns A server plugin.
 */
export function hmrCssPlugin() {
    /**
     * @type {Map<string, CSSResource>}
     */
    const dependencyTree = new Map();
    let rootDir = '';

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'css-hmr',
        injectWebSocket: true,

        async serverStart(args) {
            const { webSockets, fileWatcher, config } = args;

            if (!fileWatcher) {
                throw new Error('Cannot use HMR when watch mode is disabled.');
            }

            if (!webSockets) {
                throw new Error('Cannot use HMR when web sockets are disabled.');
            }

            rootDir = config.rootDir;

            let lock = false;

            const send = webSockets.send;
            webSockets.send = function (message) {
                const messageData = JSON.parse(message);
                if (messageData.type === 'hmr:reload' && lock) {
                    return;
                }
                return send.call(this, message);
            };

            /**
             * @param {string} filePath
             */
            const handleFile = (filePath) => !!filePath.match(/\.(c|sc|sa|le)ss$/);

            /**
             * @param {string} filePath
             */
            const lockFile = (filePath) => {
                lock = handleFile(filePath);
            };

            /**
             * @param {string} filePath
             */
            const onFileChanged = (filePath) => {
                if (!handleFile(filePath)) {
                    return;
                }

                try {
                    const entrypoints = invalidateResource(dependencyTree, filePath).map(
                        (entryPoint) => entryPoint.url
                    );
                    const content = createCssLiveReload();
                    webSockets.sendImport(`data:text/javascript,${content}`, [entrypoints]);
                } catch {
                    //
                }
            };

            fileWatcher.prependListener('change', (filePath) => lockFile(filePath));
            fileWatcher.prependListener('unlink', (filePath) => lockFile(filePath));
            fileWatcher.on('change', (filePath) => onFileChanged(filePath));
            fileWatcher.on('unlink', (filePath) => onFileChanged(filePath));
        },

        async transform(context) {
            if (!context.response.is('css')) {
                return;
            }

            const filePath = getRequestFilePath(context.url, rootDir);
            const fileEntry = ensureResource(
                dependencyTree,
                filePath,
                new URL(context.url, `${context.request.protocol}://${context.request.headers.host}`).href
            );

            const referer = context.request.headers.referer;
            if (!referer) {
                return;
            }

            const refererPath = getRequestFilePath(new URL(referer).pathname, rootDir);
            const referEntry = dependencyTree.get(refererPath);
            if (!referEntry) {
                return;
            }

            referEntry.dependencies.push(filePath);
            fileEntry.dependants.push(refererPath);
        },
    };

    return plugin;
}
