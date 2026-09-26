import { getDroppedEntries } from '../../src/zip/domEntryAdapter.js';

function fakeDataTransfer(items) {
    return { items };
}

describe('getDroppedEntries', () => {
    it('uses webkitGetAsEntry() when it returns a real entry', () => {
        const entry = { name: 'folder', isDirectory: true, isFile: false };
        const dataTransfer = fakeDataTransfer([{ kind: 'file', webkitGetAsEntry: () => entry }]);

        expect(getDroppedEntries(dataTransfer)).toEqual([entry]);
    });

    it('falls back to the plain File when webkitGetAsEntry() returns null', () => {
        // This is the case for `File` objects added to a DataTransfer
        // programmatically (as opposed to a real OS-level drag), which is
        // how both some browsers behave for ordinary file drops and how our
        // own e2e tests simulate a drop.
        const file = { name: 'notes.txt' };
        const dataTransfer = fakeDataTransfer([
            { kind: 'file', webkitGetAsEntry: () => null, getAsFile: () => file },
        ]);

        const [entry] = getDroppedEntries(dataTransfer);
        expect(entry.name).toBe('notes.txt');
        expect(entry.isFile).toBe(true);
        expect(entry.isDirectory).toBe(false);
        return expect(new Promise((resolve) => entry.file(resolve))).resolves.toBe(file);
    });

    it('falls back to the plain File when webkitGetAsEntry is not implemented at all', () => {
        const file = { name: 'notes.txt' };
        const dataTransfer = fakeDataTransfer([{ kind: 'file', getAsFile: () => file }]);

        expect(getDroppedEntries(dataTransfer)[0].name).toBe('notes.txt');
    });

    it('drops items whose fallback also produces nothing', () => {
        const dataTransfer = fakeDataTransfer([{ kind: 'file', getAsFile: () => null }]);
        expect(getDroppedEntries(dataTransfer)).toEqual([]);
    });

    it('ignores non-file drag items (e.g. dragged text)', () => {
        const dataTransfer = fakeDataTransfer([{ kind: 'string', getAsFile: () => null }]);
        expect(getDroppedEntries(dataTransfer)).toEqual([]);
    });
});
