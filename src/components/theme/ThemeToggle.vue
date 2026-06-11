<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AppliedTheme, DarkAccentPreference, ThemePreference } from '../../composables/useTheme'

const preference = defineModel<ThemePreference>({ required: true })
const accentPreference = defineModel<DarkAccentPreference>('accentPreference', { required: true })

defineProps<{
  appliedTheme: AppliedTheme
}>()

const options: Array<{ label: string; value: ThemePreference }> = [
  { label: '系統', value: 'system' },
  { label: '淺色', value: 'light' },
  { label: '深色', value: 'dark' },
]

const accentOptions: Array<{ label: string; value: DarkAccentPreference }> = [
  { label: '石墨', value: 'graphite' },
  { label: '午夜藍', value: 'midnight' },
  { label: '冷杉', value: 'spruce' },
  { label: '苔灰', value: 'moss' },
  { label: '霧灰', value: 'mist' },
  { label: '暖琥珀', value: 'amber' },
  { label: '森林綠', value: 'emerald' },
  { label: '深海藍', value: 'cyan' },
  { label: '暮紫', value: 'violet' },
  { label: '酒紅', value: 'rose' },
]

const isAccentPanelOpen = ref(false)
const selectedAccentLabel = computed(
  () => accentOptions.find((option) => option.value === accentPreference.value)?.label ?? '石墨',
)
</script>

<template>
  <div class="theme-toggle" aria-label="主題切換">
    <div class="theme-toggle__mode">
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

    <section v-if="appliedTheme === 'dark'" class="theme-toggle__accent">
      <button
        class="theme-toggle__accent-toggle"
        type="button"
        :aria-expanded="isAccentPanelOpen"
        @click="isAccentPanelOpen = !isAccentPanelOpen"
      >
        <span>深色配色</span>
        <span>{{ selectedAccentLabel }}</span>
        <span aria-hidden="true">{{ isAccentPanelOpen ? '收合' : '展開' }}</span>
      </button>

      <div v-if="isAccentPanelOpen" class="theme-toggle__swatches">
        <button
          v-for="option in accentOptions"
          :key="option.value"
          class="theme-toggle__swatch"
          :class="{ 'theme-toggle__swatch--active': accentPreference === option.value }"
          :data-accent="option.value"
          type="button"
          :aria-label="`深色配色：${option.label}`"
          :title="option.label"
          @click="accentPreference = option.value"
        >
          <span aria-hidden="true"></span>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  gap: var(--space-3);
}

.theme-toggle__mode {
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

.theme-toggle__accent {
  display: grid;
  gap: var(--space-2);
}

.theme-toggle__accent-toggle {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-2);
  min-height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-strong);
  background: var(--color-surface);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
}

.theme-toggle__accent-toggle span:nth-child(2),
.theme-toggle__accent-toggle span:nth-child(3) {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-weight: 750;
}

.theme-toggle__swatches {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-2);
}

.theme-toggle__swatch {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--space-2);
  min-height: 34px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: var(--color-surface);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.theme-toggle__swatch span:first-child {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--swatch-color);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.theme-toggle__swatch[data-accent='amber'] {
  --swatch-color: #f0b35a;
}

.theme-toggle__swatch[data-accent='graphite'] {
  --swatch-color: #a8b0bb;
}

.theme-toggle__swatch[data-accent='midnight'] {
  --swatch-color: #8eb4ff;
}

.theme-toggle__swatch[data-accent='spruce'] {
  --swatch-color: #8fcfb4;
}

.theme-toggle__swatch[data-accent='moss'] {
  --swatch-color: #a8c083;
}

.theme-toggle__swatch[data-accent='mist'] {
  --swatch-color: #b7c4d1;
}

.theme-toggle__swatch[data-accent='emerald'] {
  --swatch-color: #5ee0a0;
}

.theme-toggle__swatch[data-accent='cyan'] {
  --swatch-color: #67c7f0;
}

.theme-toggle__swatch[data-accent='violet'] {
  --swatch-color: #b8a1ff;
}

.theme-toggle__swatch[data-accent='rose'] {
  --swatch-color: #ff8fa3;
}

.theme-toggle__swatch--active {
  border-color: var(--color-primary);
  color: var(--color-text-strong);
  background: var(--color-primary-soft);
}

.theme-toggle__accent-toggle:focus-visible,
.theme-toggle__button:focus-visible,
.theme-toggle__swatch:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 860px) {
  .theme-toggle__swatches {
    grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  }

  .theme-toggle__swatch {
    justify-items: center;
    grid-template-columns: 1fr;
    min-height: 42px;
  }
}
</style>
