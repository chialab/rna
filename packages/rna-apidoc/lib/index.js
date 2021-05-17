import path from 'path';
import { promises } from 'fs';
import TypeDoc from 'typedoc';
import markdown from './renderers/markdown.js';

const { writeFile, mkdir } = promises;

/**
 * Generate documentation for typescript files.
 * @param {string[]} entryPoints Entrypoints to documentate.
 * @param {string} output Output path.
 */
export async function generate(entryPoints, output) {
    const app = new TypeDoc.Application();
    app.options.addReader(new TypeDoc.TSConfigReader());
    app.options.addReader(new TypeDoc.TypeDocReader());

    app.bootstrap({
        logLevel: 'Warn',
        entryPoints,
    });

    const project = app.convert();
    if (!project) {
        throw new Error('Cannot generate documentation for given entrypoints');
    }

    const outputFile = path.extname(output) ? output : path.join(output, 'API.md');
    const outputDir = path.extname(output) ? path.dirname(output) : output;
    await mkdir(outputDir, { recursive: true });

    const json = await app.serializer.projectToObject(project);
    const data = markdown(json);
    await writeFile(outputFile, data);
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('apidoc [files...]')
        .description('Generate api documentation using TypeScript symbols.')
        .requiredOption('-O, --output <path>', 'output dir or file')
        .action(
            /**
             * @param {string[]} files
             * @param {{ output: string }} options
             */
            async (files, { output }) => {
                await generate(files, output);
            }
        );
}
