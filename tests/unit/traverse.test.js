import { collectFiles } from '../../src/zip/traverse.js';
import { createFilter } from '../../src/zip/filter.js';

function fakeFile(name, content) {
    return {
        name,
        isDirectory: false,
        isFile: true,
        getFile: async () => ({ name, content }),
    };
}

function fakeDir(name, children) {
    return {
        name,
        isDirectory: true,
        isFile: false,
        listChildren: async () => children,
    };
}

async function collectPaths(entry, shouldInclude) {
    const results = [];
    for await (const { path } of collectFiles(entry, shouldInclude)) {
        results.push(path);
    }
    return results.sort();
}

describe('collectFiles', () => {
    it('yields every file with its path relative to the root, depth first', async () => {
        const tree = fakeDir('Project', [
            fakeFile('readme.txt', 'hi'),
            fakeDir('src', [fakeFile('index.js', ''), fakeFile('util.js', '')]),
        ]);

        const paths = await collectPaths(tree, () => true);

        expect(paths).toEqual(['Project/readme.txt', 'Project/src/index.js', 'Project/src/util.js']);
    });

    it('skips a whole subtree when a directory is excluded', async () => {
        const tree = fakeDir('Project', [
            fakeFile('keep.txt', ''),
            fakeDir('.git', [fakeFile('HEAD', '')]),
        ]);

        const shouldInclude = createFilter({ excludeHidden: true });
        const paths = await collectPaths(tree, shouldInclude);

        expect(paths).toEqual(['Project/keep.txt']);
    });

    it('never emits an entry for a folder that ends up with no files (empty-folder exclusion)', async () => {
        const tree = fakeDir('Project', [
            fakeDir('empty', []),
            fakeDir('only-excluded', [fakeFile('WaveCache.wfm', '')]),
            fakeFile('keep.txt', ''),
        ]);

        const shouldInclude = createFilter({ patterns: ['WaveCache.wfm'] });
        const paths = await collectPaths(tree, shouldInclude);

        expect(paths).toEqual(['Project/keep.txt']);
    });

    it('excludes a single file that matches a pattern without touching its siblings', async () => {
        const tree = fakeDir('Project', [
            fakeFile('session.bak.001.ptx', ''),
            fakeFile('session.ptx', ''),
        ]);

        const shouldInclude = createFilter({ patterns: ['*.bak.???.ptx'] });
        const paths = await collectPaths(tree, shouldInclude);

        expect(paths).toEqual(['Project/session.ptx']);
    });
});
