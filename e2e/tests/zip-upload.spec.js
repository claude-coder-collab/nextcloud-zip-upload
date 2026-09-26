import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// NOTE on scope: real OS-level "drag a folder from your file manager" cannot
// be simulated through the DOM DataTransfer API - a FileSystemDirectoryEntry
// can only be produced by the browser from an actual drag off the host
// filesystem. This test instead drops several in-memory `File` objects
// (which Chromium *does* expose through `webkitGetAsEntry()` as
// FileSystemFileEntry instances), which exercises the exact same code path
// for filtering, zipping and uploading. The recursive directory-walking
// logic itself is covered separately by the traverse.js unit tests, and
// src/zip/domEntryAdapter.js - the only piece not exercised here - is a thin,
// deliberately dumb wrapper around the native FileSystemEntry API.

const ADMIN_USER = process.env.NEXTCLOUD_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.NEXTCLOUD_ADMIN_PASSWORD || 'admin';

test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/index.php/login`);
    await page.fill('#user', ADMIN_USER);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('#submit-form, button[type="submit"]');
    await page.waitForURL('**/apps/**');
});

test('zips a dropped selection, applies default exclusions, and uploads it', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/index.php/apps/zip_upload/`);

    const dropZone = page.locator('.drop-zone');
    await expect(dropZone).toBeVisible();

    const dataTransfer = await page.evaluateHandle(() => {
        const dt = new DataTransfer();
        const files = [
            ['notes.txt', 'kept: plain file'],
            ['.hidden.txt', 'excluded: hidden file'],
            ['WaveCache.wfm', 'excluded: default pattern (exact name)'],
            ['session.bak.001.ptx', 'excluded: default pattern (glob)'],
            ['session.ptx', 'kept: does not match the exclusion glob'],
        ];
        for (const [name, content] of files) {
            dt.items.add(new File([content], name, { type: 'text/plain' }));
        }
        return dt;
    });

    await dropZone.dispatchEvent('drop', { dataTransfer });

    const status = page.locator('.zip-upload-app__status');
    await expect(status).toHaveText(/^Uploaded upload-[\d-]+\.zip to \/$/, { timeout: 30_000 });

    const filename = (await status.textContent()).match(/Uploaded (upload-[\d-]+\.zip) to/)[1];

    const davUrl = `${baseURL}/remote.php/dav/files/${ADMIN_USER}/${filename}`;
    const auth = Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString('base64');
    const response = await fetch(davUrl, { headers: { Authorization: `Basic ${auth}` } });
    expect(response.status).toBe(200);

    const zipPath = path.join(os.tmpdir(), `zip-upload-e2e-${Date.now()}.zip`);
    writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
    try {
        const listing = JSON.parse(
            execFileSync('python3', [
                '-c',
                `
import json, zipfile
with zipfile.ZipFile(${JSON.stringify(zipPath)}) as zf:
    assert zf.testzip() is None
    print(json.dumps(sorted(zf.namelist())))
`,
            ]).toString('utf8'),
        );

        expect(listing).toEqual(['notes.txt', 'session.ptx']);
    } finally {
        unlinkSync(zipPath);
    }
});
