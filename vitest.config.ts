import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            all: false,
            include: ['packages/*/lib'],
            reporter: [['clover'], ['html']],
        },
    },
});
