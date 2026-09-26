import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ZipWriter, toDosDateTime } from '../../src/zip/zipWriter.js';

// We validate against Python's stdlib `zipfile` rather than the system
// `unzip` binary: it correctly honours the UTF-8 (EFS) filename flag we set,
// which several older `unzip` builds (notably Debian's) silently ignore.
const hasPython = (() => {
    try {
        execFileSync('python3', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
})();

describe('toDosDateTime', () => {
    it('encodes a known date/time', () => {
        const { date, time } = toDosDateTime(new Date(2026, 0, 5, 9, 3, 6));
        // year 2026 -> (46 << 9), month 1 -> (1 << 5), day 5
        expect(date).toBe((46 << 9) | (1 << 5) | 5);
        // hour 9 -> (9 << 11), minute 3 -> (3 << 5), second 6 -> 3
        expect(time).toBe((9 << 11) | (3 << 5) | 3);
    });

    it('clamps years before 1980', () => {
        const { date } = toDosDateTime(new Date(1970, 0, 1));
        expect(date).toBe((0 << 9) | (1 << 5) | 1);
    });
});

describe('ZipWriter', () => {
    it('produces an empty-but-valid archive with no entries', async () => {
        const zip = new ZipWriter();
        const blob = zip.finalize();
        const buffer = Buffer.from(await blob.arrayBuffer());
        expect(buffer.readUInt32LE(0)).toBe(0x06054b50);
    });

    it('round-trips file content and paths', async () => {
        const zip = new ZipWriter();
        await zip.addFile('Project/readme.txt', new Blob(['hello world']), { lastModified: Date.now() });
        await zip.addFile('Project/src/empty.js', new Blob([]), { lastModified: Date.now() });
        await zip.addFile('Project/données.txt', new Blob(['unicode name']), { lastModified: Date.now() });

        const blob = zip.finalize();
        const buffer = Buffer.from(await blob.arrayBuffer());

        // No compression was used anywhere: method field (bytes 8-9 of every
        // local file header, signature 0x04034b50) must be 0.
        let offset = 0;
        let localHeaderCount = 0;
        while (offset < buffer.length - 4 && buffer.readUInt32LE(offset) === 0x04034b50) {
            expect(buffer.readUInt16LE(offset + 8)).toBe(0);
            const nameLength = buffer.readUInt16LE(offset + 26);
            const extraLength = buffer.readUInt16LE(offset + 28);
            const size = buffer.readUInt32LE(offset + 22);
            offset += 30 + nameLength + extraLength + size;
            localHeaderCount++;
        }
        expect(localHeaderCount).toBe(3);

        if (!hasPython) {
            return;
        }

        const dir = mkdtempSync(path.join(tmpdir(), 'zip-upload-test-'));
        const zipPath = path.join(dir, 'out.zip');
        writeFileSync(zipPath, buffer);
        try {
            const script = `
import json
import zipfile

with zipfile.ZipFile(${JSON.stringify(zipPath)}) as zf:
    assert zf.testzip() is None, "CRC mismatch detected by zipfile.testzip()"
    result = {
        "names": sorted(zf.namelist()),
        "methods": sorted({info.compress_type for info in zf.infolist()}),
        "readme": zf.read("Project/readme.txt").decode("utf-8"),
    }
    print(json.dumps(result))
`;
            const output = execFileSync('python3', ['-c', script]).toString('utf8');
            const result = JSON.parse(output);

            expect(result.names).toEqual(
                ['Project/données.txt', 'Project/readme.txt', 'Project/src/empty.js'].sort(),
            );
            expect(result.methods).toEqual([0]); // zipfile.ZIP_STORED
            expect(result.readme).toBe('hello world');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('rejects more than 65535 entries', async () => {
        const zip = new ZipWriter();
        zip._centralRecords.length = 0xffff;
        await expect(zip.addFile('one-too-many.txt', new Blob(['x']))).rejects.toThrow(/Too many files/);
    });
});
