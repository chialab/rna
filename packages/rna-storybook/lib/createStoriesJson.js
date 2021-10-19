/**
 * @see https://github.com/storybookjs/storybook/blob/next/lib/core-server/src/utils/StoryIndexGenerator.ts
 * @see https://github.com/storybookjs/storybook/blob/next/lib/core-common/src/utils/normalize-stories.ts
 */

import path from 'path';
import { autoTitleFromSpecifier, sortStoriesV7 } from '@storybook/store';
import { readCsfOrMdx } from '@storybook/csf-tools';

/**
 * @typedef {import('@storybook/store').StoryIndex} StoryIndex
 */

/**
 * @typedef {import('@storybook/core-common').NormalizedStoriesSpecifier} NormalizedStoriesSpecifier
 */

/**
 * @typedef {Record<string, StoryIndex['stories'] | false>} SpecifierStoriesCache
 */

/**
 * @param {string} story
 * @param {string} rootDir
 * @return {import('@storybook/core-common').NormalizedStoriesSpecifier}
 */
function normalizeStoriesEntry(story, rootDir) {
    story = path.relative(rootDir, story);
    if (story[0] !== '.') {
        story = `./${story}`;
    }
    return {
        titlePrefix: '',
        directory: path.dirname(story),
        files: path.basename(story),
        importPathMatcher: new RegExp(story),
    };
}

/**
 * @param {NormalizedStoriesSpecifier} specifier
 * @param {SpecifierStoriesCache} entry
 * @param {string} absolutePath
 * @param {string} root
 */
async function extractStories(specifier, entry, absolutePath, root) {
    const relativePath = path.relative(root, absolutePath);
    /**
     * @type {import('@storybook/store').StoryIndex['stories']}
     */
    const fileStories = {};
    const importPath = relativePath[0] === '.' ? relativePath : `./${relativePath}`;
    const defaultTitle = autoTitleFromSpecifier(importPath, specifier);
    const csf = (await readCsfOrMdx(absolutePath, { defaultTitle })).parse();
    csf.stories.forEach(({ id, name }) => {
        fileStories[id] = {
            id,
            title: csf.meta.title || '',
            name,
            importPath,
        };
    });

    entry[absolutePath] = fileStories;

    return fileStories;
}

/**
 *
 * @param {StoryIndex['stories']} stories
 * @param {*} storySort
 * @param {string[]} fileNameOrder
 */
function sortExtractedStories(stories, storySort, fileNameOrder) {
    const sortableStories = Object.values(stories);
    sortStoriesV7(sortableStories, storySort, fileNameOrder);
    return sortableStories.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, /** @type {StoryIndex['stories']} */ ({}));
}

/**
 * @param {string[]} storyFiles
 * @param {string} rootDir
 */
export async function createStorySpecifiers(storyFiles, rootDir = process.cwd()) {
    /**
     * @type {Map<NormalizedStoriesSpecifier, SpecifierStoriesCache>}
     */
    const storyIndexEntries = new Map();

    await Promise.all(
        storyFiles.map(async (story) => {
            /**
             * @type {SpecifierStoriesCache}
             */
            const entry = {};
            const specifier = normalizeStoriesEntry(story, rootDir);
            storyIndexEntries.set(specifier, entry);
            return extractStories(specifier, entry, story, rootDir);
        })
    );

    return storyIndexEntries;
}

/**
 * @param {string[]} storyFiles
 * @param {string} rootDir
 * @param {{ storySort?: any }} config
 */
export async function createStoriesJson(storyFiles, rootDir = process.cwd(), config = {}) {
    const storyIndexEntries = await createStorySpecifiers(storyFiles, rootDir);
    const entries = Array.from(storyIndexEntries.values());
    const storiesList = entries.flatMap((entry) => Object.values(entry));
    const storyFileNames = entries.flatMap((r) => Object.keys(r));

    /**
     * @type {StoryIndex['stories']}
     */
    const stories = {};

    storiesList.forEach((subStories) => {
        Object.assign(stories, subStories);
    });

    const sorted = sortExtractedStories(stories, config.storySort, storyFileNames);
    const titleToStoryCount = Object.values(sorted)
        .reduce((acc, story) => {
            acc[story.title] = (acc[story.title] || 0) + 1;
            return acc;
        }, /** @type {Record<string, number>} */ ({}));

    const compat = Object.entries(sorted).reduce((acc, entry) => {
        const [id, story] = entry;
        acc[id] = {
            ...story,
            id,
            kind: story.title,
            story: story.name,
            parameters: {
                __id: story.id,
                docsOnly: titleToStoryCount[story.title] === 1 && story.name === 'Page',
                fileName: story.importPath,
            },
        };

        return acc;
    }, /** @type {Record<string, *>} */({}));

    return {
        v: 3,
        stories: compat,
    };
}
