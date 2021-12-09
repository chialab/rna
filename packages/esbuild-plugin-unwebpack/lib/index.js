import path from 'path';
import { glob } from '@chialab/node-resolve';
import { MagicString, TokenType, getBlock, getNodeComments, parse, walk } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Remove webpack features from sources.
 * @return An esbuild plugin.
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
                 * @type {MagicString|undefined}
                 */
                let magicCode;

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const { processor } = await parse(code);
                await walk(processor, (token) => {
                    if (!processor.matches3(TokenType.name, TokenType.parenL, TokenType.backQuote) ||
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

                    const initial = processor.stringValueForToken(block[3]);
                    const identifier = processor.identifierNameForToken(block[5]);

                    magicCode = magicCode || new MagicString(code);
                    promises.push((async () => {
                        const map = (await glob(`${initial}*`, {
                            cwd: path.dirname(args.path),
                        }))
                            .filter((name) => name.match(include) && (!exclude || !name.match(exclude)))
                            .reduce((map, name) => {
                                map[name.replace(include, '')] = `./${name}`;
                                return map;
                            }, /** @type {{ [key: string]: string }} */({}));

                        magicCode.overwrite(start, end, `({ ${Object.keys(map).map((key) => `'${key}': () => import('${map[key]}')`).join(', ')} })[${identifier}]()`);
                    })());
                });

                await walk(processor, (token, start) => {
                    if (!processor.matches1(TokenType._if)) {
                        return;
                    }

                    const testBlock = getBlock(processor, TokenType.parenL, TokenType.parenR).slice(2, -1);
                    const bodyBlock = getBlock(processor, TokenType.braceL, TokenType.braceR);
                    const end = bodyBlock[bodyBlock.length - 1].end;

                    // if (module.hot) {
                    if (testBlock.length === 2
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'module'
                        && testBlock[1].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[1]) === 'hot'
                    ) {
                        magicCode = magicCode || new MagicString(code);
                        magicCode.overwrite(start, end, '');
                    }

                    // if (import.meta.webpackHot) {
                    if (testBlock.length === 3
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'import'
                        && testBlock[1].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[1]) === 'meta'
                        && testBlock[2].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[2]) === 'webpackHot'
                    ) {
                        magicCode = magicCode || new MagicString(code);
                        magicCode.overwrite(start, end, '');
                    }

                    // if (module && module.hot) {
                    if (testBlock.length === 4
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'module'
                        && testBlock[1].type === TokenType.logicalAND
                        && testBlock[2].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[2]) === 'module'
                        && testBlock[3].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[3]) === 'hot'
                    ) {
                        magicCode = magicCode || new MagicString(code);
                        magicCode.overwrite(start, end, '');
                    }

                    // if (module && module.hot && module.hot.decline) {
                    if (testBlock.length === 8
                        && testBlock[0].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[0]) === 'module'
                        && testBlock[1].type === TokenType.logicalAND
                        && testBlock[2].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[2]) === 'module'
                        && testBlock[3].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[3]) === 'hot'
                        && testBlock[4].type === TokenType.logicalAND
                        && testBlock[5].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[5]) === 'module'
                        && testBlock[6].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[6]) === 'hot'
                        && testBlock[7].type === TokenType.name
                        && processor.identifierNameForToken(testBlock[7]) === 'decline'
                    ) {
                        magicCode = magicCode || new MagicString(code);
                        magicCode.overwrite(start, end, '');
                    }
                });

                await Promise.all(promises);

                if (!magicCode) {
                    return;
                }

                return {
                    code: magicCode.toString(),
                    map: sourcemap ? magicCode.generateMap({
                        source: args.path,
                        includeContent: sourcesContent,
                        hires: true,
                    }) : undefined,
                };
            });
        },
    };

    return plugin;
}
