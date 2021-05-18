import path from 'path';
import { promises } from 'fs';
import TypeDoc from 'typedoc';
import markdown from './renderers/markdown.js';

const { writeFile, mkdir } = promises;

/**
 * Generate documentation for typescript files.
 * @param {string[]} entryPoints Entrypoints to documentate.
 * @param {'json'|'markdown'} format The output format.
 * @param {string} [output] Output path.
 */
export async function generate(entryPoints, format = 'json', output = undefined) {
    const app = new TypeDoc.Application();
    app.options.addReader(new TypeDoc.TSConfigReader());
    app.options.addReader(new TypeDoc.TypeDocReader());

    app.bootstrap({
        logLevel: 3,
        entryPoints,
    });
    app.logger.level = 3;

    const project = app.convert();
    if (!project) {
        throw new Error('Cannot generate documentation for given entrypoints');
    }

    const json = await app.serializer.projectToObject(project);
    const data = format === 'markdown' ? markdown(json) : JSON.stringify(json, null, 4);
    if (output) {
        const outputFile = path.extname(output) ? output : path.join(output, 'API.md');
        const outputDir = path.extname(output) ? path.dirname(output) : output;
        await mkdir(outputDir, { recursive: true });
        await writeFile(outputFile, data);
    } else {
        process.stdout.write(data);
    }
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('apidoc [files...]')
        .description('Generate api documentation using TypeScript symbols.')
        .option('-O, --output <path>', 'output dir or file')
        .option('-F, --format <string>', 'the output format (json or markdown)')
        .action(
            /**
             * @param {string[]} files
             * @param {{ output?: string, format?: 'json'|'markdown' }} options
             */
            async (files, { format, output }) => {
                await generate(files, format, output);
            }
        );
}
