<script setup lang="ts" generic="T extends string">
defineProps<{
  label: string
  options: Array<{ label: string; value: T }>
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <fieldset class="segmented-control">
    <legend>{{ label }}</legend>
    <div class="segmented-control__options">
      <button
        v-for="option in options"
        :key="option.value"
        class="segmented-control__button"
        :class="{ 'segmented-control__button--active': model === option.value }"
        type="button"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.segmented-control {
  display: grid;
  gap: var(--space-3);
  padding: 0;
  border: 0;
  margin: 0;
}

.segmented-control legend {
  margin-bottom: var(--space-3);
  color: var(--color-text-strong);
  font-weight: 750;
}

.segmented-control__options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-muted);
}

.segmented-control__button {
  min-height: 42px;
  border: 0;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  background: transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.segmented-control__button--active {
  color: var(--color-text-strong);
  background: var(--color-surface);
  box-shadow: var(--shadow-control);
}

.segmented-control__button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 620px) {
  .segmented-control__options {
    grid-template-columns: 1fr;
  }
}
</style>
