# Zip Upload for Nextcloud

Drag a folder onto the **Zip Upload** page in Nextcloud and it gets packed
into a single, uncompressed (store-only) `.zip` archive entirely in your
browser, then uploaded as one file to a folder of your choice - instead of
uploading every file individually.

Store-only means the browser never spends CPU time compressing (most files
people zip for archival/transfer are already-compressed formats anyway), so
packing is fast even for large folders.

## Default exclusions

These are left out of the archive unless you change the settings before
dropping a folder:

- Hidden files and folders (names starting with `.`)
- `WaveCache.wfm`
- `*.bak.???.ptx`
- Any folder that ends up empty after the above (this falls out naturally:
  the archive only ever contains file entries, never directory entries, so a
  folder with nothing left inside it simply isn't represented)

Both the hidden-file toggle and the pattern list are editable from the
**Exclusions** panel on the page, per upload.

## How it works

- **Traversal**: `DataTransferItem.webkitGetAsEntry()` gives access to the
  dropped folder tree without uploading anything first
  ([`src/zip/domEntryAdapter.js`](src/zip/domEntryAdapter.js) wraps the
  native API, [`src/zip/traverse.js`](src/zip/traverse.js) does the actual
  recursive walk against a small platform-agnostic interface so it's
  unit-testable without a browser)
- **Filtering**: hidden-file check plus glob patterns
  (`*`/`?`) matched against each entry's own name
  ([`src/zip/filter.js`](src/zip/filter.js),
  [`src/zip/globToRegExp.js`](src/zip/globToRegExp.js))
- **Zipping**: a small hand-rolled, dependency-free ZIP writer
  ([`src/zip/zipWriter.js`](src/zip/zipWriter.js)) that only ever emits
  method 0 (store) entries, streaming each file's bytes through CRC-32 rather
  than buffering the whole file where the browser supports `Blob.stream()`
- **Uploading**: a single `PUT` to the user's Nextcloud WebDAV endpoint
  ([`src/upload/webdav.js`](src/upload/webdav.js))

### Known limitations

- Classic ZIP format only - no Zip64, so archives are capped at 65,535
  entries and 4 GiB total size. Comfortably covers ordinary folder uploads.
- The upload is a single `PUT`; there's no chunked/resumable upload, so it's
  bound by your server's `upload_max_filesize`/`post_max_size`.
- Requires `webkitGetAsEntry()` drag-and-drop support (all current Chromium
  and Firefox-based browsers; Safari support is more recent).

## Development

```bash
npm install
npm run build   # or `npm run watch` while developing
```

Copy or symlink this directory into your Nextcloud instance's `apps/` (or
`custom_apps/`) directory as `zip_upload`, then enable it:

```bash
php occ app:enable zip_upload
```

### Tests

Unit tests (pure logic - CRC-32, glob matching, filtering, tree traversal,
ZIP byte layout - verified against Python's `zipfile` for spec correctness):

```bash
npm test
```

End-to-end tests drive a real Nextcloud instance in Docker with Playwright,
covering the drop → filter → zip → WebDAV-upload → server-side-verification
path:

```bash
npm run build   # produces js/, which gets baked into the image below
docker compose -f e2e/docker-compose.yml up -d --build
# wait for http://localhost:8080/status.php to respond, then:
docker compose -f e2e/docker-compose.yml exec -u www-data nextcloud php occ app:enable zip_upload
npm run test:e2e
docker compose -f e2e/docker-compose.yml down -v
```

Real OS-level folder drag-and-drop can't be produced through the DOM
`DataTransfer` API outside of an actual drag off the host filesystem, so the
e2e test drops several in-memory `File` objects instead (Chromium still
routes these through `webkitGetAsEntry()` as real `FileSystemFileEntry`
instances, exercising the same filter/zip/upload code path). The recursive
directory-walking logic itself is covered by the `traverse.js` unit tests.

## License

MIT, see [LICENSE](LICENSE).
