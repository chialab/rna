/**
 * @param {import('plop').NodePlopAPI} plop
 */
module.exports = function (plop) {
    plop.setGenerator('module', {
        description: 'RNA ecosystem module.',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'name of the module:',
            },
            {
                type: 'input',
                name: 'description',
                message: 'description of the module:',
            },
        ],
        actions: [
            {
                type: 'add',
                path: '../../packages/{{dashCase name}}/package.json',
                templateFile: './template/package.json.hbs',
                abortOnFail: true,
            },
            {
                type: 'add',
                path: '../../packages/{{dashCase name}}/tsconfig.json',
                templateFile: './template/tsconfig.json.hbs',
                abortOnFail: true,
            },
            {
                type: 'add',
                path: '../../packages/{{dashCase name}}/README.md',
                templateFile: './template/README.md.hbs',
                abortOnFail: true,
            },
            {
                type: 'add',
                path: '../../packages/{{dashCase name}}/LICENSE.md',
                templateFile: './template/LICENSE.hbs',
                abortOnFail: true,
            },
            {
                type: 'add',
                path: '../../packages/{{dashCase name}}/lib/index.js',
                templateFile: './template/index.js.hbs',
                abortOnFail: true,
            },
        ],
    });
};
