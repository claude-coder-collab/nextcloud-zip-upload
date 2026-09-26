import { generateRemoteUrl } from '@nextcloud/router';
import { getRequestToken } from '@nextcloud/auth';

/**
 * Uploads a Blob to the current user's WebDAV root via a single PUT.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.folder folder path relative to the user's root, e.g. "/Documents"
 * @param {string} params.filename
 * @param {Blob} params.blob
 * @param {(loaded: number, total: number) => void} [params.onProgress]
 * @returns {Promise<void>}
 */
export function uploadZip({ userId, folder, filename, blob, onProgress }) {
    const remotePath = joinPath(folder, filename);
    const url = generateRemoteUrl(`dav/files/${encodeURIComponent(userId)}${encodePath(remotePath)}`);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('requesttoken', getRequestToken() ?? '');
        if (onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    onProgress(event.loaded, event.total);
                }
            });
        }
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error while uploading')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
        xhr.send(blob);
    });
}

function joinPath(folder, filename) {
    const normalizedFolder = folder.replace(/\/+$/, '');
    return `${normalizedFolder}/${filename}`;
}

function encodePath(path) {
    return path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}
