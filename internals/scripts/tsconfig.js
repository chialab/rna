import { readFile, writeFile } from 'fs/promises';
import { dirname, relative, resolve } from 'path';
import { Project } from '@lerna/project';
import { modify, applyEdits } from 'jsonc-parser';

const ROOT = resolve(
    dirname(import.meta.url.replace('file://', '')),
    '../../'
);

Project.getPackages(ROOT)
    .then(async (packages) => {
        const tsconfig = resolve(ROOT, 'tsconfig.json');
        const content = await readFile(tsconfig, 'utf-8');
        const references = packages.map((pkg) => ({
            path: `./${relative(ROOT, pkg.location)}`,
        }));
        const edits = modify(content, ['references'], references, {
            formattingOptions: {
                insertSpaces: true,
                tabSize: 2,
                eol: '\n',
            },
        });

        await writeFile(tsconfig, applyEdits(content, edits));

        await Promise.all(
            packages.map(async (pkg) => {
                const root = pkg.location;
                const tsconfig = resolve(root, 'tsconfig.json');
                const content = await readFile(tsconfig, 'utf-8');
                try {
                    const dependencies = {
                        ...(pkg.get('dependencies') || {}),
                        ...(pkg.get('peerDependencies') || {}),
                    };
                    const references = Object.keys(dependencies)
                        .map((key) => packages.find((pkg) => pkg.get('name') === key))
                        .filter((pkg) => !!pkg)
                        .map((pkg) => ({
                            path: relative(root, pkg.location),
                        }));
                    const edits = modify(content, ['references'], references, {
                        formattingOptions: {
                            insertSpaces: true,
                            tabSize: 2,
                            eol: '\n',
                        },
                    });

                    await writeFile(tsconfig, applyEdits(content, edits));
                } catch (err) {
                    // eslint-disable-next-line
                    console.error(err, pkg.location, content);
                }
            })
        );
    });
