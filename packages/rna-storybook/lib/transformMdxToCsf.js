import mdx from '@mdx-js/mdx';
import esbuild from 'esbuild';
import { createCompiler } from '@storybook/csf-tools/mdx.js';

const compilers = [createCompiler({})];

/**
 * @param {string} body
 * @param {string} filePath
 */
export async function transformMdxToCsf(body, filePath) {
    const mdxSource = await mdx(body.replace(/import\.meta\.url/g, 'import$meta$url'), { compilers, filepath: filePath });
    const source = `import React from 'react';
import { mdx } from '@mdx-js/react';
${mdxSource}
`;
    const { code } = await esbuild.transform(source, { loader: 'jsx', sourcemap: false, tsconfigRaw: '{}' });

    return code.replace(/import\$meta\$url/g, 'import.meta.url');
}
