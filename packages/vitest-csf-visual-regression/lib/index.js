/* global document, HTMLIFrameElement */
/// <reference types="vitest/config" />
/// <reference types="@vitest/browser-playwright" />
/// <reference lib="dom" />
import MagicString from 'magic-string';
import { createFilter } from 'vite';

/**
 * @typedef {import('vite').FilterPattern} FilterPattern
 * @typedef {import('vite').Plugin} Plugin
 * @typedef {import('vitest/browser').BrowserCommands} BrowserCommands
 * @typedef {import('vitest/browser').BrowserPage} BrowserPage
 * @typedef {import('vitest/browser').UserEvent} UserEvent
 * @typedef {import('vitest/node').BrowserConfigOptions} BrowserConfigOptions
 * @typedef {import('./client').VisualRegressionVitestUtils} VisualRegressionVitestUtils
 */

/**
 * @typedef {Exclude<Exclude<BrowserConfigOptions['expect'], undefined>['toMatchScreenshot'], undefined>} ScreenshotOptions
 */

/**
 * @typedef {Object} MockOptions
 * @property {Date} [date] - Date to mock before rendering the story. Uses vi.setSystemTime internally.
 * @property {boolean | number[]} [random] - Random values to mock before rendering the story. If true, uses a fixed sequence of values. If an array of numbers is provided, uses those numbers as the sequence of random values.
 * @property {{accuracy: number, altitude: number | null, altitudeAccuracy: number | null, heading: number | null, latitude: number, longitude: number, speed: number | null} | null} [geolocation] - Geolocation position to mock before rendering the story. If null, it will simulate a geolocation error.
 */

/**
 * @typedef {Object} RenderContext
 * @property {HTMLElement} canvasElement
 * @property {BrowserPage} page
 * @property {BrowserCommands} commands
 * @property {UserEvent} userEvent
 * @property {VisualRegressionVitestUtils} vi
 */

/**
 * @typedef {ScreenshotOptions & {
 *   width?: string | number,
 *   height?: string | number,
 *   padding?: string | number,
 *   mock?: MockOptions,
 *   beforeRender?: (context: RenderContext) => Promise<void> | void,
 *   afterRender?: (context: RenderContext) => Promise<void> | void
 * }} CsfVisualRegressionParams
 */

/**
 * @typedef {Object} PluginOptions
 * @property {string} [framework='@storybook/react'] - The Storybook framework to use
 * @property {FilterPattern} [include=['**\/*.stories.{js,jsx,ts,tsx}']] - Files to include
 * @property {FilterPattern} [exclude] - Files to exclude
 * @property {string} [previewFile] - Preview file path
 * @property {number} [networkIdleTimeout=10000] - Network idle timeout in milliseconds
 * @property {string | number} [padding='10px'] - Default padding for canvas element
 */

/**
 * Creates a Vite plugin for CSF visual regression testing
 * @param {PluginOptions} options - Plugin configuration options
 * @returns {Plugin} Vite plugin
 */
export default function csfVisualRegressionPlugin({
    framework = '@storybook/react',
    include = ['**/*.stories.{js,jsx,ts,tsx}'],
    exclude,
    previewFile,
    networkIdleTimeout = 10_000,
    padding = '10px',
}) {
    const filter = createFilter(include, exclude);

    return {
        name: 'csf-visual-regression-plugin',
        enforce: 'pre',
        apply: (config, { mode }) => mode === 'test',
        config(config) {
            config.optimizeDeps ??= {};
            config.optimizeDeps.include ??= [];
            config.optimizeDeps.include.push(
                '@chialab/vitest-csf-visual-regression/client',
                'react/jsx-dev-runtime',
                framework
            );
            if (previewFile) {
                config.optimizeDeps.entries ??= [];
                config.optimizeDeps.entries = [
                    ...(Array.isArray(config.optimizeDeps.entries)
                        ? config.optimizeDeps.entries
                        : [config.optimizeDeps.entries]),
                    previewFile,
                ];
            }

            config.test ??= {};
            config.test.browser ??= {};
            config.test.browser.commands ??= {};
            config.test.browser.commands._csfVisualRegressionWaitLoad = async ({ provider, frame }, options) => {
                if (provider.name === 'playwright') {
                    const iframe = await frame();
                    await iframe.waitForLoadState('networkidle', {
                        timeout: options.timeout,
                    });
                    await iframe.evaluate(() => {
                        document.getAnimations().forEach((animation) => {
                            animation.pause();
                        });
                    });
                } else {
                    // eslint-disable-next-line no-console
                    console.warn('_csfVisualRegressionWaitLoad command is only implemented for Playwright provider.');
                }
            };
            config.test.browser.commands._csfVisualRegressionSetSize = async ({ provider, page, frame }) => {
                if (provider.name === 'playwright') {
                    const iframe = await frame();
                    const { width, height } = await iframe.evaluate(async () => {
                        const html = document.documentElement;
                        const body = document.body;

                        return {
                            width: Math.max(
                                body.scrollWidth,
                                body.offsetWidth,
                                html.clientWidth,
                                html.scrollWidth,
                                html.offsetWidth
                            ),
                            height: Math.max(
                                body.scrollHeight,
                                body.offsetHeight,
                                html.clientHeight,
                                html.scrollHeight,
                                html.offsetHeight
                            ),
                        };
                    });

                    await page.evaluate(
                        ({ width, height }) => {
                            const iframe = document.querySelector('[data-vitest="true"]');
                            if (iframe instanceof HTMLIFrameElement) {
                                iframe.style.width = `${width}px`;
                                iframe.style.height = `${height}px`;
                            }
                        },
                        { width, height }
                    );
                } else {
                    // eslint-disable-next-line no-console
                    console.warn('_csfVisualRegressionSetSize command is only implemented for Playwright provider.');
                }
            };

            return config;
        },

        transform(code, id) {
            if (!filter(id)) {
                return null;
            }

            const fileName = id.split('/').pop();
            const magic = new MagicString(code);
            magic.append(`
if (import.meta.vitest && import.meta.url?.includes('browserv')) {
    const { afterEach, beforeEach, beforeAll, describe, expect, test } = import.meta.vitest;
    const { vi } = await import('@chialab/vitest-csf-visual-regression/client');
    const { renderStory, setProjectAnnotations } = await import('${framework}');
    const { commands, page, userEvent } = await import('vitest/browser');
    const stories = await import('./${fileName}');
    ${previewFile ? `const previewAnnotations = await import('${previewFile}');` : ''}

    // Restore original expect in globalThis after storybook patches it.
    Object.defineProperty(globalThis, Symbol.for('expect-global'), {
        value: expect,
    });

    beforeAll(async () => {
        await setProjectAnnotations(previewAnnotations ? [previewAnnotations] : []).beforeAll();
    });

    describe(stories.default?.component ?? '${fileName}', () => {
        let canvasElement;
        beforeEach(() => {
            canvasElement = document.createElement('div');
            canvasElement.className = 'csf-visual-regression-root';
            canvasElement.style.position = 'relative';
            canvasElement.style.display = 'block';
            canvasElement.style.width = 'fit-content';
            canvasElement.style.height = 'fit-content';
            canvasElement.style.padding = '${typeof padding === 'number' ? `${padding}px` : padding}';
            document.body.appendChild(canvasElement);
        });
        afterEach(() => {
            canvasElement?.remove();
            vi.useRealTimers();
            vi.useRealRandom();
            vi.useRealGeolocation();
        });

        for (const storyName in stories) {
            const story = stories[storyName];
            if (storyName === 'default' || !story || typeof story !== 'object' || typeof story.render !== 'function') {
                continue;
            }

            test(story.name ?? storyName, async () => {
                if (story.visualRegression?.mock) {
                    if (story.visualRegression.mock?.date) {
                        vi.useFakeTimers({
                            toFake: ['Date'],
                        });
                        vi.setSystemTime(story.visualRegression.mock.date);
                    }
                    if (story.visualRegression.mock.random) {
                        vi.useFakeRandom(story.visualRegression.mock.random === true ? undefined : story.visualRegression.mock.random);
                    }
                    if ('geolocation' in story.visualRegression.mock) {
                        vi.useFakeGeolocation(story.visualRegression.mock.geolocation);
                    }
                }
                if (story.visualRegression?.width) {
                    canvasElement.style.width = typeof story.visualRegression.width === 'number' ? story.visualRegression.width + 'px' : story.visualRegression.width;
                }
                if (story.visualRegression?.height) {
                    canvasElement.style.height = typeof story.visualRegression.height === 'number' ? story.visualRegression.height + 'px' : story.visualRegression.height;
                }
                if (story.visualRegression?.padding) {
                    canvasElement.style.padding = typeof story.visualRegression.padding === 'number' ? story.visualRegression.padding + 'px' : story.visualRegression.padding;
                }

                await story.visualRegression?.beforeRender?.({ canvasElement, page, commands, userEvent, vi });
                await renderStory(story, canvasElement);
                await commands._csfVisualRegressionWaitLoad({ timeout: ${networkIdleTimeout} });
                await story.visualRegression?.afterRender?.({ canvasElement, page, commands, userEvent, vi });
                await commands._csfVisualRegressionSetSize();
                await expect(page.elementLocator(canvasElement)).toMatchScreenshot(story.visualRegression);
            });
        }
    });
}
`);

            return {
                code: magic.toString(),
                map: magic.generateMap({ hires: true }),
            };
        },
    };
}
