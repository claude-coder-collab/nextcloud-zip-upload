/**
 * Wraps a native `FileSystemEntry` (as handed out by
 * `DataTransferItem.webkitGetAsEntry()`) into the plain {@link TreeEntry}
 * shape that {@link collectFiles} understands, so the traversal logic itself
 * never has to touch the quirky native API.
 *
 * @param {FileSystemEntry} entry
 * @returns {import('./traverse.js').TreeEntry}
 */
export function wrapFileSystemEntry(entry) {
    return {
        name: entry.name,
        isDirectory: entry.isDirectory,
        isFile: entry.isFile,
        getFile: () => new Promise((resolve, reject) => entry.file(resolve, reject)),
        listChildren: () => readAllDirectoryEntries(entry).then((entries) => entries.map(wrapFileSystemEntry)),
    };
}

/**
 * `FileSystemDirectoryReader.readEntries()` may return results in batches
 * and must be called repeatedly until it resolves with an empty array.
 *
 * @param {FileSystemDirectoryEntry} directoryEntry
 * @returns {Promise<FileSystemEntry[]>}
 */
function readAllDirectoryEntries(directoryEntry) {
    const reader = directoryEntry.createReader();
    const all = [];
    return new Promise((resolve, reject) => {
        const readBatch = () => {
            reader.readEntries((batch) => {
                if (batch.length === 0) {
                    resolve(all);
                    return;
                }
                all.push(...batch);
                readBatch();
            }, reject);
        };
        readBatch();
    });
}

/**
 * Extracts the top-level `FileSystemEntry` objects from a drop event's
 * DataTransfer, ignoring any dragged items that aren't files/folders.
 *
 * @param {DataTransfer} dataTransfer
 * @returns {FileSystemEntry[]}
 */
export function getDroppedEntries(dataTransfer) {
    return Array.from(dataTransfer.items)
        .filter((item) => item.kind === 'file')
        .map((item) => item.webkitGetAsEntry())
        .filter((entry) => entry !== null);
}
