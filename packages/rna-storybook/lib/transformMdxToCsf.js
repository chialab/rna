import mdx from '@mdx-js/mdx';
import esbuild from 'esbuild';
import { createCompiler } from '@storybook/csf-tools/mdx.js';

const compilers = [createCompiler({})];

/**
 * @param {string} body
 * @param {string} filePath
 */
export async function transformMdxToCsf(body, filePath) {
    body = `import React from 'react';
import { mdx } from '@mdx-js/react';

${body}`;

    body = body.replace(/import\.meta\.url/g, 'import$meta$url');
    body = await mdx(body, { compilers, filepath: filePath });
    body = body.replace(/import\$meta\$url/g, 'import.meta.url');
    const { code } = await esbuild.transform(body, { loader: 'jsx', sourcemap: false, tsconfigRaw: '{}' });
    return code;
}
