import path from 'path';
import { readFile } from 'fs/promises';
import esbuild from 'esbuild';
import { glob } from '@chialab/node-resolve';
import * as tools from './csf-tools.cjs';
import { StoryIndexGenerator } from '@storybook/core-server/dist/cjs/utils/StoryIndexGenerator.js';
import { transformMdxToCsf } from './transformMdxToCsf.js';

/**
 * @param {string} rootDir
 * @param {string[]} storiesPatterns
 */
async function findStories(rootDir, storiesPatterns) {
    const storyPaths = await glob(storiesPatterns, { cwd: rootDir, absolute: false });
    return storyPaths.map((p) => path.join(rootDir, p.split('/').join(path.sep)));
}

/**
 * @param {string} rootDir
 * @param {string} entry
 */
function normalizeStory(rootDir, entry) {
    entry = path.relative(rootDir, entry);
    if (entry[0] !== '.') {
        entry = `./${entry}`;
    }
    return {
        titlePrefix: '',
        directory: path.dirname(entry),
        files: path.basename(entry),
        importPathMatcher: new RegExp(entry),
    };
}

/**
 * @param {string} fileName
 * @param {import('@storybook/core-common').IndexerOptions} opts
 */
async function csfIndexer(fileName, opts) {
    const code = await readFile(fileName, 'utf-8');
    const csfFile = tools.loadCsf(code, { ...opts, fileName });
    return csfFile.parse();
}

/**
 * @param {string} fileName
 * @param {import('@storybook/core-common').IndexerOptions} opts
 */
async function mdxIndexer(fileName, opts) {
    const code = await transformMdxToCsf(await readFile(fileName, 'utf-8'), esbuild);
    const csfFile = tools.loadCsf(code, { ...opts, fileName });
    return csfFile.parse();
}

/**
 * @param {string} rootDir
 * @param {string[]} storiesPatterns
 * @param {{ storySort?: any }} [config]
 */
export async function createStoryIndexGenerator(rootDir, storiesPatterns, config = {}) {
    const directories = {
        configDir: rootDir,
        workingDir: rootDir,
    };
    const stories = await findStories(rootDir, storiesPatterns);
    const normalizedStories = stories.map((story) => normalizeStory(rootDir, story));

    const generator = new StoryIndexGenerator(normalizedStories, {
        ...directories,
        storyIndexers: [
            {
                test: /(stories|story)\.[tj]sx?$/,
                indexer: csfIndexer,
            },
            {
                test: /(stories|story)\.mdx$/,
                indexer: mdxIndexer,
                addDocsTemplate: true,
            },
        ],
        storiesV2Compatibility: false,
        storyStoreV7: true,
        docs: {
            enabled: true,
            defaultName: 'Docs',
            docsPage: false,
        },
    });

    if (config.storySort) {
        generator.getStorySortParameter = () => Promise.resolve(config.storySort);
    }

    await generator.initialize();

    return generator;
}
