<template>
    <details class="exclusion-settings">
        <summary>{{ t('zip_upload', 'Exclusions') }}</summary>

        <label class="exclusion-settings__row">
            <input v-model="localExcludeHidden" type="checkbox" @change="emitChange" />
            {{ t('zip_upload', 'Exclude hidden files and folders (starting with ".")') }}
        </label>

        <p class="exclusion-settings__hint">
            {{ t('zip_upload', 'One glob pattern per line, matched against each file/folder name. "*" matches any run of characters, "?" matches a single character.') }}
        </p>

        <textarea
            v-model="patternsText"
            class="exclusion-settings__patterns"
            rows="4"
            :aria-label="t('zip_upload', 'Exclusion patterns')"
            @input="emitChange" />

        <p class="exclusion-settings__hint">
            {{ t('zip_upload', 'Folders that end up empty after exclusions are left out automatically.') }}
        </p>
    </details>
</template>

<script>
import { translate as t } from '@nextcloud/l10n';
import { DEFAULT_EXCLUDE_HIDDEN, DEFAULT_EXCLUDE_PATTERNS } from '../config/defaultExclusions.js';

export default {
    name: 'ExclusionSettings',

    props: {
        excludeHidden: {
            type: Boolean,
            default: DEFAULT_EXCLUDE_HIDDEN,
        },
        patterns: {
            type: Array,
            default: () => [...DEFAULT_EXCLUDE_PATTERNS],
        },
    },

    emits: ['update:excludeHidden', 'update:patterns'],

    data() {
        return {
            localExcludeHidden: this.excludeHidden,
            patternsText: this.patterns.join('\n'),
        };
    },

    methods: {
        t,
        emitChange() {
            this.$emit('update:excludeHidden', this.localExcludeHidden);
            this.$emit(
                'update:patterns',
                this.patternsText
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0),
            );
        },
    },
};
</script>

<style scoped>
.exclusion-settings {
    margin-top: 1rem;
    max-width: 32rem;
}

.exclusion-settings__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.75rem 0;
}

.exclusion-settings__hint {
    color: var(--color-text-maxcontrast);
    font-size: 0.85rem;
    margin: 0.25rem 0;
}

.exclusion-settings__patterns {
    width: 100%;
    font-family: var(--font-face-monospace, monospace);
}
</style>
