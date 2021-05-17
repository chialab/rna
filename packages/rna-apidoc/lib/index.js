import TypeDoc from 'typedoc';

/**
 * Generate documentation for typescript files.
 * @param {string[]} entryPoints Entrypoints to documentate.
 */
export async function generate(entryPoints) {
    const app = new TypeDoc.Application();
    app.options.addReader(new TypeDoc.TSConfigReader());
    app.options.addReader(new TypeDoc.TypeDocReader());

    app.bootstrap({
        entryPoints,
    });

    const project = app.convert();

    console.log(project);
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('apidoc [files...]')
        .description('Generate api documentation using TypeScript symbols.')
        .option('-O, --output <file>', 'output file')
        .action(
            /**
             * @param {string[]} files
             * @param {{ output: string }} options
             */
            async (files, { output }) => {
                await generate(files);
            }
        );
}
