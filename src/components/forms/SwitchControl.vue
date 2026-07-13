<script setup lang="ts">
import { Switch } from '@/components/ui/switch'

defineProps<{
  label: string
  description?: string
}>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label
    class="flex min-h-16 items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 text-card-foreground shadow-xs transition-colors hover:bg-muted/50"
  >
    <span class="grid gap-0.5">
      <span class="text-sm font-medium">{{ label }}</span>
      <span v-if="description" class="text-xs text-muted-foreground">{{ description }}</span>
    </span>
    <Switch v-model="model" :aria-label="label" />
  </label>
</template>
