import { globToRegExp } from '../../src/zip/globToRegExp.js';

describe('globToRegExp', () => {
    it.each([
        ['WaveCache.wfm', 'WaveCache.wfm', true],
        ['WaveCache.wfm', 'wavecache.wfm', true],
        ['WaveCache.wfm', 'OtherCache.wfm', false],
        ['*.bak.???.ptx', 'session.bak.001.ptx', true],
        ['*.bak.???.ptx', 'session.bak.abc.ptx', true],
        ['*.bak.???.ptx', 'session.bak.0001.ptx', false],
        ['*.bak.???.ptx', 'session.bak..ptx', false],
        ['*.bak.???.ptx', 'session.ptx', false],
        ['*.tmp', 'file.tmp', true],
        ['*.tmp', 'file.tmp.bak', false],
        ['a?c', 'abc', true],
        ['a?c', 'ac', false],
        ['a.b', 'aXb', false],
    ])('pattern %s against %s -> %s', (pattern, name, expected) => {
        expect(globToRegExp(pattern).test(name)).toBe(expected);
    });
});
