import { readdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyEdits, modify } from 'jsonc-parser';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../');
const PACKAGES_DIR = resolve(ROOT, 'packages');

function writeReferences(tsconfig, content, references) {
    const edits = modify(content, ['references'], references, {
        formattingOptions: {
            insertSpaces: true,
            tabSize: 2,
            eol: '\n',
        },
    });

    return writeFile(tsconfig, applyEdits(content, edits));
}

const dirs = await readdir(PACKAGES_DIR, { withFileTypes: true });
const packages = await Promise.all(
    dirs
        .filter((dirent) => dirent.isDirectory())
        .map(async (dirent) => {
            const cwd = resolve(PACKAGES_DIR, dirent.name);
            const manifest = JSON.parse(await readFile(resolve(cwd, 'package.json'), 'utf-8'));

            return { cwd, manifest };
        })
);

const tsconfig = resolve(ROOT, 'tsconfig.json');
const content = await readFile(tsconfig, 'utf-8');
const references = packages.map((pkg) => ({
    path: `./${relative(ROOT, pkg.cwd)}`,
}));

await writeReferences(tsconfig, content, references);

await Promise.all(
    packages.map(async (pkg) => {
        const {
            cwd,
            manifest: { dependencies = {}, peerDependencies = {}, devDependencies = {} },
        } = pkg;
        const tsconfig = resolve(cwd, 'tsconfig.json');
        const content = await readFile(tsconfig, 'utf-8');

        try {
            const depNames = [
                ...Object.keys(dependencies),
                ...Object.keys(peerDependencies),
                ...Object.keys(devDependencies),
            ];
            const references = depNames
                .map((depName) => packages.find(({ manifest }) => manifest.name === depName))
                .filter((pkg) => !!pkg)
                .map((pkg) => ({
                    path: relative(cwd, pkg.cwd),
                }));

            await writeReferences(tsconfig, content, references);
        } catch (err) {
            console.error(err, cwd, content);
        }
    })
);
