import mdx from '@mdx-js/mdx';
import { createCompiler } from '@storybook/csf-tools/mdx.js';

const compilers = [createCompiler({})];

/**
 * @param {string} body
 * @param {string} fileName
 * @param {typeof import('esbuild')} esbuild
 */
export async function transformMdxToCsf(body, fileName, esbuild) {
    body = `import React from 'react';
import { mdx } from '@mdx-js/react';

${body}`;

    body = await mdx(body, { compilers, filepath: fileName });

    const result = await esbuild.transform(body, {
        loader: 'jsx',
        sourcemap: false,
        tsconfigRaw: '{ "compilerOptions": { "jsxFactory": "mdx" } }',
        jsxFactory: 'mdx',
    });

    return {
        code: result.code,
    };
}
