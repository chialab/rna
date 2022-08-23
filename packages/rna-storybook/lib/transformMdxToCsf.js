import { toEstree } from 'hast-util-to-estree';
import { plugin, postprocess } from '@storybook/mdx2-csf/dist/cjs/index.js';
import { compile } from '@mdx-js/mdx';

/**
 * @param {string} body
 * @param {typeof import('esbuild')} esbuild
 */
export async function transformMdxToCsf(body, esbuild) {
    const store = { exports: '', toEstree };

    body = (await compile(body, {
        rehypePlugins: [[plugin, store]],
        providerImportSource: '@mdx-js/react',
    })).toString();

    body = postprocess(body, store.exports)
        .replace('export default MDXContent;', '');

    const { code } = await esbuild.transform(body, {
        loader: 'jsx',
        sourcemap: false,
        tsconfigRaw: '{ "compilerOptions": {} }',
    });

    return `import React from 'react';\n${code}`;
}
