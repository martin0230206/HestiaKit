<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { ChevronUpIcon, MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AppliedTheme, DarkAccentPreference, ThemePreference } from '@/composables/useTheme'

const preference = defineModel<ThemePreference>({ required: true })
const accentPreference = defineModel<DarkAccentPreference>('accentPreference', { required: true })

defineProps<{
  appliedTheme: AppliedTheme
}>()

const options: Array<{ icon: Component; label: string; value: ThemePreference }> = [
  { icon: MonitorIcon, label: '跟隨系統', value: 'system' },
  { icon: SunIcon, label: '淺色', value: 'light' },
  { icon: MoonIcon, label: '深色', value: 'dark' },
]

const accentOptions: Array<{ color: string; label: string; value: DarkAccentPreference }> = [
  { color: 'var(--accent-swatch-graphite)', label: '石墨', value: 'graphite' },
  { color: 'var(--accent-swatch-midnight)', label: '午夜藍', value: 'midnight' },
  { color: 'var(--accent-swatch-spruce)', label: '冷杉', value: 'spruce' },
  { color: 'var(--accent-swatch-moss)', label: '苔灰', value: 'moss' },
  { color: 'var(--accent-swatch-mist)', label: '霧灰', value: 'mist' },
  { color: 'var(--accent-swatch-amber)', label: '暖琥珀', value: 'amber' },
  { color: 'var(--accent-swatch-emerald)', label: '森林綠', value: 'emerald' },
  { color: 'var(--accent-swatch-cyan)', label: '深海藍', value: 'cyan' },
  { color: 'var(--accent-swatch-violet)', label: '暮紫', value: 'violet' },
  { color: 'var(--accent-swatch-rose)', label: '酒紅', value: 'rose' },
]

const selectedOption = computed(() => options.find((option) => option.value === preference.value) ?? options[0])
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        class="w-full justify-start gap-2 bg-sidebar group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!"
        aria-label="切換顯示主題"
      >
        <component :is="selectedOption.icon" class="size-4 shrink-0" />
        <span class="truncate group-data-[collapsible=icon]:hidden">{{ selectedOption.label }}</span>
        <ChevronUpIcon class="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent side="right" align="end" class="w-56">
      <DropdownMenuLabel>顯示主題</DropdownMenuLabel>
      <DropdownMenuRadioGroup v-model="preference">
        <DropdownMenuRadioItem v-for="option in options" :key="option.value" :value="option.value">
          <component :is="option.icon" class="size-4" />
          {{ option.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>

      <template v-if="appliedTheme === 'dark'">
        <DropdownMenuSeparator />
        <DropdownMenuLabel class="flex items-center gap-2">
          <PaletteIcon class="size-4" />
          深色配色
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup v-model="accentPreference">
          <DropdownMenuRadioItem
            v-for="option in accentOptions"
            :key="option.value"
            :value="option.value"
          >
            <span class="size-3 rounded-full ring-1 ring-border" :style="{ backgroundColor: option.color }"></span>
            {{ option.label }}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
