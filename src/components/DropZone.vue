<template>
    <div
        class="drop-zone"
        :class="{ 'drop-zone--active': isDragOver, 'drop-zone--disabled': disabled }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop">
        <p>{{ t('zip_upload', 'Drag and drop a folder here to zip and upload it') }}</p>
    </div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n';
import { getDroppedEntries } from '../zip/domEntryAdapter.js';

export default {
    name: 'DropZone',

    props: {
        disabled: {
            type: Boolean,
            default: false,
        },
    },

    emits: ['drop-entries'],

    data() {
        return {
            isDragOver: false,
        };
    },

    methods: {
        t,
        onDragOver() {
            if (!this.disabled) {
                this.isDragOver = true;
            }
        },
        onDrop(event) {
            this.isDragOver = false;
            if (this.disabled) {
                return;
            }
            const entries = getDroppedEntries(event.dataTransfer);
            if (entries.length > 0) {
                this.$emit('drop-entries', entries);
            }
        },
    },
};
</script>

<style scoped>
.drop-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 12rem;
    border: 2px dashed var(--color-border-dark);
    border-radius: var(--border-radius-large);
    color: var(--color-text-maxcontrast);
    text-align: center;
    padding: 1rem;
    transition: border-color 0.1s ease-in-out, background-color 0.1s ease-in-out;
}

.drop-zone--active {
    border-color: var(--color-primary-element);
    background-color: var(--color-primary-element-light);
}

.drop-zone--disabled {
    opacity: 0.5;
    pointer-events: none;
}
</style>
