import { crc32 } from '../../src/zip/crc32.js';

describe('crc32', () => {
    it('matches the known CRC-32 of an empty input', () => {
        expect(crc32(new Uint8Array())).toBe(0x00000000);
    });

    it('matches the known CRC-32 of "123456789"', () => {
        const bytes = new TextEncoder().encode('123456789');
        // Canonical CRC-32/ISO-HDLC check value.
        expect(crc32(bytes)).toBe(0xcbf43926);
    });

    it('matches the known CRC-32 of "The quick brown fox jumps over the lazy dog"', () => {
        const bytes = new TextEncoder().encode('The quick brown fox jumps over the lazy dog');
        expect(crc32(bytes)).toBe(0x414fa339);
    });
});
