/**
 * Converts a simple shell-style glob (only `*` and `?` wildcards, matched
 * case-insensitively against a whole file/folder name) into a RegExp.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${pattern}$`, 'i');
}
