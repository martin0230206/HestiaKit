<script setup lang="ts" generic="T extends string">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

defineProps<{
  disabled?: boolean
  label: string
  options: Array<{ label: string; value: T }>
}>()

const model = defineModel<T>({ required: true })

function updateModel(value: unknown) {
  if (typeof value === 'string' && value) {
    model.value = value as T
  }
}
</script>

<template>
  <fieldset class="grid gap-3" :disabled="disabled">
    <legend class="text-sm font-medium text-foreground">{{ label }}</legend>
    <ToggleGroup
      type="single"
      variant="outline"
      class="segmented-control__options w-full"
      :model-value="model"
      :disabled="disabled"
      :style="{ '--segmented-option-count': options.length }"
      @update:model-value="updateModel"
    >
      <ToggleGroupItem
        v-for="option in options"
        :key="option.value"
        class="h-10 w-full text-sm"
        :value="option.value"
      >
        {{ option.label }}
      </ToggleGroupItem>
    </ToggleGroup>
  </fieldset>
</template>

<style scoped>
.segmented-control__options {
  display: grid;
  grid-template-columns: repeat(var(--segmented-option-count), minmax(0, 1fr));
}

@media (max-width: 620px) {
  .segmented-control__options {
    grid-template-columns: 1fr;
  }
}
</style>
