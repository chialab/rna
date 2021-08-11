export function collect($, dom, cssPath, attr) {
    return dom
        .find(cssPath)
        .get()
        .filter((el) => {
            const path = $(el).attr(attr);
            return (
                !path ||
                path.startsWith("//") ||
                path.startsWith("http://") ||
                path.startsWith("https://")
            );
        });
}
