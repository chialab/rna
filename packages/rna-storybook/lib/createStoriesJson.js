import { createRequire } from 'module';
import { normalizeStoriesEntry } from '@storybook/core-common';

const require = createRequire(import.meta.url);
const { StoryIndexGenerator } = require('@storybook/core-server/dist/cjs/utils/StoryIndexGenerator.js');

/**
 * @param {string[]} stories
 * @param {string} root
 */
export async function createStoriesJson(stories, root = process.cwd()) {
    const generator = new StoryIndexGenerator(stories.map((story) => normalizeStoriesEntry(story, {
        workingDir: root,
        configDir: root,
    })), {
        workingDir: root,
        configDir: root,
        storiesV2Compatibility: true,
    });
    await generator.initialize();

    return await generator.getIndex();
}
