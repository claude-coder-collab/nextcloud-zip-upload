<template>
    <div class="zip-upload-app">
        <h2>{{ t('zip_upload', 'Zip Upload') }}</h2>

        <DropZone :disabled="isBusy" @drop-entries="handleDrop" />

        <ExclusionSettings
            v-model:exclude-hidden="excludeHidden"
            v-model:patterns="patterns" />

        <div class="zip-upload-app__target">
            <label>{{ t('zip_upload', 'Upload to') }}</label>
            <code>{{ targetFolder }}</code>
            <button type="button" :disabled="isBusy" @click="pickTargetFolder">
                {{ t('zip_upload', 'Change') }}
            </button>
        </div>

        <p v-if="status" class="zip-upload-app__status" role="status">{{ status }}</p>
    </div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n';
import { getFilePickerBuilder, FilePickerType } from '@nextcloud/dialogs';
import { getCurrentUser } from '@nextcloud/auth';
import DropZone from './components/DropZone.vue';
import ExclusionSettings from './components/ExclusionSettings.vue';
import { wrapFileSystemEntry } from './zip/domEntryAdapter.js';
import { collectFiles } from './zip/traverse.js';
import { createFilter } from './zip/filter.js';
import { ZipWriter } from './zip/zipWriter.js';
import { suggestArchiveName } from './zip/archiveName.js';
import { uploadZip } from './upload/webdav.js';
import { DEFAULT_EXCLUDE_HIDDEN, DEFAULT_EXCLUDE_PATTERNS } from './config/defaultExclusions.js';

export default {
    name: 'App',

    components: { DropZone, ExclusionSettings },

    data() {
        return {
            excludeHidden: DEFAULT_EXCLUDE_HIDDEN,
            patterns: [...DEFAULT_EXCLUDE_PATTERNS],
            targetFolder: '/',
            status: '',
            isBusy: false,
        };
    },

    methods: {
        t,

        async handleDrop(nativeEntries) {
            this.isBusy = true;
            try {
                const entries = nativeEntries.map(wrapFileSystemEntry);
                const shouldInclude = createFilter({
                    excludeHidden: this.excludeHidden,
                    patterns: this.patterns,
                });

                this.status = t('zip_upload', 'Reading files…');
                const zip = new ZipWriter();
                let fileCount = 0;
                for (const entry of entries) {
                    for await (const { path, file } of collectFiles(entry, shouldInclude)) {
                        await zip.addFile(path, file, { lastModified: file.lastModified });
                        fileCount++;
                        this.status = t('zip_upload', 'Reading files… ({count} so far)', { count: fileCount });
                    }
                }

                if (fileCount === 0) {
                    this.status = t('zip_upload', 'Nothing to upload: every dropped item was excluded.');
                    return;
                }

                this.status = t('zip_upload', 'Packing {count} files…', { count: fileCount });
                const blob = zip.finalize();
                const filename = suggestArchiveName(entries);

                this.status = t('zip_upload', 'Uploading {filename}…', { filename });
                await uploadZip({
                    userId: getCurrentUser().uid,
                    folder: this.targetFolder,
                    filename,
                    blob,
                    onProgress: (loaded, total) => {
                        const percent = Math.round((loaded / total) * 100);
                        this.status = t('zip_upload', 'Uploading {filename}… {percent}%', { filename, percent });
                    },
                });

                this.status = t('zip_upload', 'Uploaded {filename} to {folder}', {
                    filename,
                    folder: this.targetFolder,
                });
            } catch (error) {
                this.status = t('zip_upload', 'Upload failed: {message}', { message: error.message });
            } finally {
                this.isBusy = false;
            }
        },

        pickTargetFolder() {
            const picker = getFilePickerBuilder(t('zip_upload', 'Choose an upload destination'))
                .setMultiSelect(false)
                .setType(FilePickerType.Choose)
                .allowDirectories(true)
                .build();

            picker.pick().then((path) => {
                this.targetFolder = path;
            });
        },
    },
};
</script>

<style scoped>
.zip-upload-app {
    padding: 2rem;
    max-width: 40rem;
}

.zip-upload-app__target {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
}

.zip-upload-app__status {
    margin-top: 1rem;
    font-weight: bold;
}
</style>
