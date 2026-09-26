/**
 * Picks a default archive file name for a set of top-level dropped entries:
 * the dropped folder's own name when exactly one folder was dropped (so
 * extracting the archive reproduces that folder), otherwise a generic,
 * timestamped name.
 *
 * @param {import('./traverse.js').TreeEntry[]} topLevelEntries
 * @param {Date} [now]
 * @returns {string}
 */
export function suggestArchiveName(topLevelEntries, now = new Date()) {
    if (topLevelEntries.length === 1 && topLevelEntries[0].isDirectory) {
        return `${topLevelEntries[0].name}.zip`;
    }
    return `upload-${formatTimestamp(now)}.zip`;
}

function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
        `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
        `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
}
