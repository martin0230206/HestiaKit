<script setup lang="ts">
defineProps<{
  label: string
  description?: string
}>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="switch-control">
    <span>
      <span class="switch-control__label">{{ label }}</span>
      <span v-if="description" class="switch-control__description">{{ description }}</span>
    </span>
    <input v-model="model" type="checkbox" />
    <span class="switch-control__track" aria-hidden="true">
      <span class="switch-control__thumb"></span>
    </span>
  </label>
</template>

<style scoped>
.switch-control {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
}

.switch-control__label,
.switch-control__description {
  display: block;
}

.switch-control__label {
  color: var(--color-text-strong);
  font-weight: 750;
}

.switch-control__description {
  color: var(--color-text-muted);
  font-size: 0.86rem;
}

.switch-control input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-control__track {
  position: relative;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: var(--color-border-strong);
  transition: background 0.18s ease;
}

.switch-control__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-control);
  transition: transform 0.18s ease;
}

.switch-control input:checked + .switch-control__track {
  background: var(--color-primary);
}

.switch-control input:checked + .switch-control__track .switch-control__thumb {
  transform: translateX(20px);
}

.switch-control:focus-within {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
