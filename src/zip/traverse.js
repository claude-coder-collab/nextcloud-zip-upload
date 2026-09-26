/**
 * A minimal, platform-agnostic file tree entry.
 * @typedef {object} TreeEntry
 * @property {string} name
 * @property {boolean} isDirectory
 * @property {boolean} isFile
 * @property {() => Promise<Blob>} [getFile] required when isFile is true
 * @property {() => Promise<TreeEntry[]>} [listChildren] required when isDirectory is true
 */

/**
 * @typedef {object} CollectedFile
 * @property {string} path slash-separated path relative to the drop root
 * @property {Blob} file
 */

/**
 * Recursively walks a tree of entries, yielding one item per file that
 * survives `shouldInclude`. Directories that don't survive `shouldInclude`
 * are skipped entirely (their contents are never visited), and directories
 * that end up contributing no files are simply never represented in the
 * output - which is exactly what we want for "exclude empty folders",
 * without needing any extra bookkeeping.
 *
 * @param {TreeEntry} entry
 * @param {(name: string) => boolean} shouldInclude
 * @param {string} [basePath]
 * @returns {AsyncGenerator<CollectedFile>}
 */
export async function* collectFiles(entry, shouldInclude, basePath = '') {
    if (!shouldInclude(entry.name)) {
        return;
    }

    const path = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isFile) {
        const file = await entry.getFile();
        yield { path, file };
        return;
    }

    if (entry.isDirectory) {
        const children = await entry.listChildren();
        for (const child of children) {
            yield* collectFiles(child, shouldInclude, path);
        }
    }
}
