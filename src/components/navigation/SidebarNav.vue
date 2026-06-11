<script setup lang="ts">
import ThemeToggle from '../theme/ThemeToggle.vue'
import type { ThemePreference } from '../../composables/useTheme'
import { tools } from '../../tools'

defineProps<{
  themePreference: ThemePreference
}>()

const emit = defineEmits<{
  'update:themePreference': [preference: ThemePreference]
}>()
</script>

<template>
  <aside class="sidebar" aria-label="工具選單">
    <div class="sidebar__brand">
      <span class="sidebar__mark" aria-hidden="true">H</span>
      <p class="sidebar__name">HestiaKit</p>
    </div>

    <nav class="sidebar__nav">
      <RouterLink
        v-for="tool in tools"
        :key="tool.name"
        class="sidebar__link"
        :to="{ name: tool.name }"
      >
        <span class="sidebar__link-icon" aria-hidden="true">{{ tool.icon }}</span>
        <span>{{ tool.label }}</span>
      </RouterLink>
    </nav>

    <ThemeToggle
      class="sidebar__theme"
      :model-value="themePreference"
      @update:model-value="emit('update:themePreference', $event)"
    />
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  display: grid;
  min-height: 100svh;
  grid-template-rows: auto 1fr auto;
  gap: var(--space-6);
  padding: var(--space-6);
  border-right: 1px solid var(--color-border);
  background:
    radial-gradient(circle at 20% 0%, var(--color-brand-glow), transparent 32%),
    var(--color-sidebar);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.sidebar__mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  color: var(--color-on-primary);
  background: linear-gradient(145deg, var(--color-primary), var(--color-primary-strong));
  font-size: 1.2rem;
  font-weight: 800;
}

.sidebar__name {
  margin: 0;
}

.sidebar__name {
  color: var(--color-text-strong);
  font-weight: 800;
  letter-spacing: 0;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 42px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  text-decoration: none;
  font-weight: 650;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.sidebar__link:hover {
  color: var(--color-text-strong);
  background: var(--color-surface-muted);
}

.sidebar__link:active {
  transform: translateY(1px);
}

.sidebar__link.router-link-exact-active {
  color: var(--color-text-strong);
  background: var(--color-surface);
  box-shadow: var(--shadow-control);
}

.sidebar__link-icon {
  display: inline-grid;
  min-width: 18px;
  place-items: center;
  color: var(--color-primary);
  font-size: 1rem;
}

@media (max-width: 860px) {
  .sidebar {
    position: static;
    min-height: auto;
    grid-template-columns: 1fr;
    gap: var(--space-4);
    padding: var(--space-4);
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar__nav {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
