import path from 'path';
import { glob } from '@chialab/node-resolve';
import { TokenType, getBlock, getNodeComments, parse, walk } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Remove webpack features from sources.
 * @returns An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'unwebpack',
        setup(build) {
            const { sourcesContent, sourcemap } = build.initialOptions;
            const { onTransform } = useRna(build);

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (!code.includes('module.hot') &&
                    !code.includes('import.meta.webpackHot') &&
                    !code.includes('webpackInclude:')) {
                    return;
                }

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const { helpers, processor } = await parse(code, args.path);
                await walk(processor, (token) => {
                    if (!processor.matches3(TokenType._import, TokenType.parenL, TokenType.backQuote) ||
                        processor.identifierNameForToken(token) !== 'import') {
                        return;
                    }

                    const block = getBlock(processor, TokenType.parenL, TokenType.parenR);
                    const start = block[0].start;
                    const end = block[block.length - 1].end;
                    const comments = getNodeComments(code, start, end);
                    const included = comments.find((value) => value.startsWith('webpackInclude:'));
                    if (!included) {
                        return;
                    }

                    const excluded = comments.find((value) => value.startsWith('webpackExclude:'));
                    const include = new RegExp(included.replace('webpackInclude:', '').trim().replace(/^\//, '').replace(/\/$/, ''));
                    const exclude = excluded && new RegExp(excluded.replace('webpackExclude:', '').trim().replace(/^\//, '').replace(/\/$/, ''));
                    const initial = code.substring(block[3].start, block[3].end);
                    const identifier = processor.identifierNameForToken(block[5]);

                    promises.push((async () => {
                        const matched = await glob(`${initial}*`, {
                            cwd: path.dirname(args.path),
                        });
                        const map = matched
                            .filter((name) => name.match(include) && (!exclude || !name.match(exclude)))
                            .reduce((map, name) => {
                                map[name.replace(include, '')] = `./${name}`;
                                return map;
                            }, /** @type {{ [key: string]: string }} */({}));

                        helpers.overwrite(start, end, `({ ${Object.keys(map).map((key) => `'${key}': () => import('${map[key]}')`).join(', ')} })[${identifier}]()`);
                    })());
                });

                await Promise.all(promises);

                await walk(processor, (token) => {
                    if (token.type !== TokenType._if) {
                        return;
                    }

                    const testBlock = getBlock(processor, TokenType.parenL, TokenType.parenR).slice(2, -1);
                    const bodyBlock = getBlock(processor, TokenType.braceL, TokenType.braceR);

                    const start = token.start;
                    const end = bodyBlock[bodyBlock.length - 1].end;

                    // if (module.hot) {
                    if (testBlock.length === 3
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'module'
                        && testBlock[1].type === TokenType.dot
                        && testBlock[2].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[2]) === 'hot'
                    ) {
                        helpers.overwrite(start, end, '');
                        return;
                    }

                    // if (import.meta.webpackHot) {
                    if (testBlock.length === 5
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'import'
                        && testBlock[1].type === TokenType.dot
                        && testBlock[2].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[2]) === 'meta'
                        && testBlock[3].type === TokenType.dot
                        && testBlock[4].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[4]) === 'webpackHot'
                    ) {
                        helpers.overwrite(start, end, '');
                        return;
                    }

                    // if (module && module.hot) {
                    if (testBlock.length === 5
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'module'
                        && testBlock[1].type === TokenType.logicalAND
                        && testBlock[2].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[2]) === 'module'
                        && testBlock[3].type === TokenType.dot
                        && testBlock[4].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[4]) === 'hot'
                    ) {
                        helpers.overwrite(start, end, '');
                        return;
                    }

                    // if (module && module.hot && module.hot.decline) {
                    if (testBlock.length === 11
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'module'
                        && testBlock[1].type === TokenType.logicalAND
                        && testBlock[2].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[2]) === 'module'
                        && testBlock[3].type === TokenType.dot
                        && testBlock[4].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[4]) === 'hot'
                        && testBlock[5].type === TokenType.logicalAND
                        && testBlock[6].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[6]) === 'module'
                        && testBlock[7].type === TokenType.dot
                        && testBlock[8].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[8]) === 'hot'
                        && testBlock[9].type === TokenType.dot
                        && testBlock[10].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[10]) === 'decline'
                    ) {
                        helpers.overwrite(start, end, '');
                    }
                });

                if (!helpers.isDirty()) {
                    return;
                }

                return helpers.generate({
                    sourcemap: !!sourcemap,
                    sourcesContent,
                });
            });
        },
    };

    return plugin;
}
