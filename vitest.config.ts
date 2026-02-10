import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            include: ['packages/*/lib'],
            reporter: [['clover'], ['html']],
        },
    },
});
