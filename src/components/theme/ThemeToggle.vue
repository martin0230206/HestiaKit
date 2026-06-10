<script setup lang="ts">
import type { ThemePreference } from '../../composables/useTheme'

const preference = defineModel<ThemePreference>({ required: true })

const options: Array<{ label: string; value: ThemePreference }> = [
  { label: '系統', value: 'system' },
  { label: '淺色', value: 'light' },
  { label: '深色', value: 'dark' },
]
</script>

<template>
  <div class="theme-toggle" aria-label="主題切換">
    <button
      v-for="option in options"
      :key="option.value"
      class="theme-toggle__button"
      :class="{ 'theme-toggle__button--active': preference === option.value }"
      type="button"
      @click="preference = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.theme-toggle__button {
  min-height: 34px;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}

.theme-toggle__button--active {
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-control);
}

.theme-toggle__button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
