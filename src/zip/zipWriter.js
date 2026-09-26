import { crc32Init, crc32Update, crc32Finish } from './crc32.js';

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const VERSION = 20;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const UNIX_REGULAR_FILE_MODE = 0o100644;

const MAX_UINT32 = 0xffffffff;
const MAX_ENTRIES = 0xffff;

/**
 * Builds a zip archive using the "store" (method 0, no compression) method
 * only. Entries are appended incrementally and the final Blob is only
 * materialised once, in {@link ZipWriter#finalize}.
 *
 * Deliberately does not support Zip64: archives are limited to 65,535
 * entries and 4 GiB total size, which comfortably covers folder uploads.
 */
export class ZipWriter {
    constructor() {
        /** @type {BlobPart[]} */
        this._parts = [];
        /** @type {Array<{nameBytes: Uint8Array, crc: number, size: number, time: number, date: number, offset: number}>} */
        this._centralRecords = [];
        this._offset = 0;
    }

    /**
     * @param {string} path slash-separated path, stored as-is in the archive
     * @param {Blob} blob file content
     * @param {object} [options]
     * @param {number|Date} [options.lastModified] defaults to now
     */
    async addFile(path, blob, { lastModified = Date.now() } = {}) {
        if (this._centralRecords.length >= MAX_ENTRIES) {
            throw new Error('Too many files for a standard (non-Zip64) zip archive');
        }

        const nameBytes = encodeUtf8(normalizeZipPath(path));
        const size = blob.size;
        if (this._offset + size > MAX_UINT32) {
            throw new Error('Archive too large for a standard (non-Zip64) zip archive');
        }

        const crc = await crc32OfBlob(blob);
        const { date, time } = toDosDateTime(new Date(lastModified));
        const offset = this._offset;

        const header = buildLocalFileHeader({ nameBytes, crc, size, date, time });
        this._parts.push(header, blob);
        this._offset += header.length + size;

        this._centralRecords.push({ nameBytes, crc, size, date, time, offset });
    }

    /**
     * @returns {Blob} the completed zip archive
     */
    finalize() {
        const centralDirectoryStart = this._offset;

        for (const record of this._centralRecords) {
            const header = buildCentralDirectoryHeader(record);
            this._parts.push(header);
            this._offset += header.length;
        }

        const centralDirectorySize = this._offset - centralDirectoryStart;
        const eocd = buildEndOfCentralDirectory({
            count: this._centralRecords.length,
            centralDirectorySize,
            centralDirectoryStart,
        });
        this._parts.push(eocd);

        return new Blob(this._parts, { type: 'application/zip' });
    }
}

function normalizeZipPath(path) {
    return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function encodeUtf8(str) {
    return new TextEncoder().encode(str);
}

async function crc32OfBlob(blob) {
    let crc = crc32Init();
    if (typeof blob.stream === 'function') {
        const reader = blob.stream().getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            crc = crc32Update(crc, value);
        }
    } else {
        crc = crc32Update(crc, new Uint8Array(await blob.arrayBuffer()));
    }
    return crc32Finish(crc);
}

/**
 * @param {Date} date
 * @returns {{date: number, time: number}} MS-DOS date/time fields
 */
export function toDosDateTime(date) {
    const year = Math.max(date.getFullYear(), 1980);
    const dosDate = (((year - 1980) & 0x7f) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    return { date: dosDate & 0xffff, time: dosTime & 0xffff };
}

function buildLocalFileHeader({ nameBytes, crc, size, date, time }) {
    const buffer = new ArrayBuffer(30 + nameBytes.length);
    const view = new DataView(buffer);
    view.setUint32(0, LOCAL_FILE_HEADER_SIGNATURE, true);
    view.setUint16(4, VERSION, true);
    view.setUint16(6, UTF8_FLAG, true);
    view.setUint16(8, STORE_METHOD, true);
    view.setUint16(10, time, true);
    view.setUint16(12, date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    new Uint8Array(buffer, 30).set(nameBytes);
    return new Uint8Array(buffer);
}

function buildCentralDirectoryHeader({ nameBytes, crc, size, date, time, offset }) {
    const buffer = new ArrayBuffer(46 + nameBytes.length);
    const view = new DataView(buffer);
    view.setUint32(0, CENTRAL_FILE_HEADER_SIGNATURE, true);
    view.setUint16(4, VERSION, true);
    view.setUint16(6, VERSION, true);
    view.setUint16(8, UTF8_FLAG, true);
    view.setUint16(10, STORE_METHOD, true);
    view.setUint16(12, time, true);
    view.setUint16(14, date, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, (UNIX_REGULAR_FILE_MODE << 16) >>> 0, true);
    view.setUint32(42, offset, true);
    new Uint8Array(buffer, 46).set(nameBytes);
    return new Uint8Array(buffer);
}

function buildEndOfCentralDirectory({ count, centralDirectorySize, centralDirectoryStart }) {
    const buffer = new ArrayBuffer(22);
    const view = new DataView(buffer);
    view.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, count, true);
    view.setUint16(10, count, true);
    view.setUint32(12, centralDirectorySize, true);
    view.setUint32(16, centralDirectoryStart, true);
    view.setUint16(20, 0, true);
    return new Uint8Array(buffer);
}
