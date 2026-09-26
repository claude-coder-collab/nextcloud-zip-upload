import { createFilter } from '../../src/zip/filter.js';
import { DEFAULT_EXCLUDE_HIDDEN, DEFAULT_EXCLUDE_PATTERNS } from '../../src/config/defaultExclusions.js';

describe('createFilter', () => {
    it('excludes hidden names by default', () => {
        const shouldInclude = createFilter();
        expect(shouldInclude('.git')).toBe(false);
        expect(shouldInclude('.DS_Store')).toBe(false);
        expect(shouldInclude('visible.txt')).toBe(true);
    });

    it('can keep hidden names when excludeHidden is false', () => {
        const shouldInclude = createFilter({ excludeHidden: false });
        expect(shouldInclude('.git')).toBe(true);
    });

    it('applies the default exclusion patterns', () => {
        const shouldInclude = createFilter({
            excludeHidden: DEFAULT_EXCLUDE_HIDDEN,
            patterns: DEFAULT_EXCLUDE_PATTERNS,
        });

        expect(shouldInclude('WaveCache.wfm')).toBe(false);
        expect(shouldInclude('project.bak.001.ptx')).toBe(false);
        expect(shouldInclude('project.ptx')).toBe(true);
        expect(shouldInclude('notes.txt')).toBe(true);
    });

    it('ignores empty pattern lines', () => {
        const shouldInclude = createFilter({ patterns: ['', '  ', '*.log'] });
        expect(shouldInclude('anything')).toBe(true);
        expect(shouldInclude('debug.log')).toBe(false);
    });
});
