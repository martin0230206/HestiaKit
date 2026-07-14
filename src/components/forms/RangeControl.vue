<script setup lang="ts">
import { computed } from 'vue'
import { Slider } from '@/components/ui/slider'

const props = defineProps<{
  disabled?: boolean
  label: string
  min: number
  max: number
  suffix?: string
}>()

const model = defineModel<number>({ required: true })
const sliderValue = computed<number[]>({
  get: () => [model.value],
  set: (value) => {
    model.value = value[0] ?? props.min
  },
})
</script>

<template>
  <fieldset class="grid gap-3" :disabled="disabled">
    <div class="flex items-center justify-between gap-3">
      <legend class="text-sm font-medium text-foreground">{{ label }}</legend>
      <output class="rounded-md bg-accent px-2.5 py-1 font-mono text-sm font-semibold text-accent-foreground">
        {{ model }}{{ suffix }}
      </output>
    </div>
    <Slider v-model="sliderValue" :aria-label="label" :disabled="disabled" :min="min" :max="max" :step="1" />
  </fieldset>
</template>
