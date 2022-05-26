import { readFile, writeFile } from 'fs/promises';
import { relative, resolve } from 'path';
import { Configuration, Project } from '@yarnpkg/core';
import { modify, applyEdits } from 'jsonc-parser';

const ROOT = resolve(new URL(import.meta.url).pathname, '../../../');
const config = Configuration.create(ROOT, ROOT);

Project.find(config, ROOT)
    .then(async ({ project }) => {
        const packages = project.topLevelWorkspace.getRecursiveWorkspaceChildren();
        const tsconfig = resolve(ROOT, 'tsconfig.json');
        const content = await readFile(tsconfig, 'utf-8');
        const references = packages.map((pkg) => ({
            path: `./${relative(ROOT, pkg.cwd)}`,
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
                const { cwd, manifest: { dependencies, peerDependencies } } = pkg;
                const tsconfig = resolve(cwd, 'tsconfig.json');
                const content = await readFile(tsconfig, 'utf-8');

                try {
                    const references = Array.from(dependencies.values())
                        .concat(Array.from(peerDependencies.values()))
                        .map((dep) => packages.find(({ manifest }) => manifest.name.scope === dep.scope && manifest.name.name === dep.name))
                        .filter((pkg) => !!pkg)
                        .map((pkg) => ({
                            path: relative(cwd, pkg.cwd),
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
