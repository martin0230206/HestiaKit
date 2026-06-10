<script setup lang="ts">
defineProps<{
  label: string
  min: number
  max: number
  suffix?: string
}>()

const model = defineModel<number>({ required: true })
</script>

<template>
  <label class="range-control">
    <span class="range-control__header">
      <span>{{ label }}</span>
      <output>{{ model }}{{ suffix }}</output>
    </span>
    <input v-model.number="model" type="range" :min="min" :max="max" />
  </label>
</template>

<style scoped>
.range-control {
  display: grid;
  gap: var(--space-3);
}

.range-control__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-strong);
  font-weight: 750;
}

.range-control output {
  min-width: 54px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-primary-strong);
  background: var(--color-primary-soft);
  text-align: center;
}

.range-control input {
  width: 100%;
  accent-color: var(--color-primary);
}
</style>
