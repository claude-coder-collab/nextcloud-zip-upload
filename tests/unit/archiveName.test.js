import { suggestArchiveName } from '../../src/zip/archiveName.js';

describe('suggestArchiveName', () => {
    it('uses the folder name when a single folder was dropped', () => {
        const name = suggestArchiveName([{ name: 'Photos', isDirectory: true }]);
        expect(name).toBe('Photos.zip');
    });

    it('falls back to a timestamped name for multiple top-level items', () => {
        const now = new Date(2026, 0, 5, 9, 3, 7);
        const name = suggestArchiveName(
            [
                { name: 'Photos', isDirectory: true },
                { name: 'notes.txt', isDirectory: false },
            ],
            now,
        );
        expect(name).toBe('upload-20260105-090307.zip');
    });

    it('falls back to a timestamped name for a single dropped file', () => {
        const now = new Date(2026, 0, 5, 9, 3, 7);
        const name = suggestArchiveName([{ name: 'notes.txt', isDirectory: false }], now);
        expect(name).toBe('upload-20260105-090307.zip');
    });
});
