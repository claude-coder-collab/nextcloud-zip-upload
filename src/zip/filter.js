import { globToRegExp } from './globToRegExp.js';

/**
 * @param {object} options
 * @param {boolean} [options.excludeHidden] exclude names starting with "."
 * @param {string[]} [options.patterns] glob patterns matched against the
 *   entry's own name (not its full path)
 * @returns {(name: string) => boolean} true if the entry should be kept
 */
export function createFilter({ excludeHidden = true, patterns = [] } = {}) {
    const regexes = patterns
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map(globToRegExp);
    return function shouldInclude(name) {
        if (excludeHidden && name.startsWith('.')) {
            return false;
        }
        return !regexes.some((re) => re.test(name));
    };
}
