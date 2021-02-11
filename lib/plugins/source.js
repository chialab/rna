module.exports = function(entryPoint, code, loader = 'tsx') {
    return {
        name: 'source',
        setup(build) {
            build.onLoad({ filter: new RegExp(`^${entryPoint}$`) }, () => ({
                contents: code,
                loader,
            }));
        },
    };
};
