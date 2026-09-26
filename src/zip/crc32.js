const TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

/**
 * @param {number} crc running CRC-32 state, initialised with 0xFFFFFFFF
 * @param {Uint8Array} bytes chunk to fold into the running state
 * @returns {number} updated running CRC-32 state
 */
export function crc32Update(crc, bytes) {
    for (let i = 0; i < bytes.length; i++) {
        crc = TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc >>> 0;
}

export function crc32Init() {
    return 0xffffffff;
}

export function crc32Finish(crc) {
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * @param {Uint8Array} bytes
 * @returns {number}
 */
export function crc32(bytes) {
    return crc32Finish(crc32Update(crc32Init(), bytes));
}
