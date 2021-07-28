/**
 * Merge metafiles
 * @param  {import('esbuild').Metafile[]} metafiles
 * @returns
 */
export function mergeMetafiles(...metafiles) {
    return metafiles.reduce((bundle,  metaFile) => (
        {
            ...bundle,
            inputs: { ...bundle.inputs, ...metaFile.inputs },
            outputs: { ...bundle.outputs, ...metaFile.outputs },
        }
    ), { inputs: {}, outputs: {} });
}
