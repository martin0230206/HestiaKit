<script setup lang="ts">
import ThemeToggle from '../theme/ThemeToggle.vue'
import type { ThemePreference } from '../../composables/useTheme'
import { tools } from '../../tools'

defineProps<{
  isCollapsed: boolean
  themePreference: ThemePreference
}>()

const emit = defineEmits<{
  'update:isCollapsed': [isCollapsed: boolean]
  'update:themePreference': [preference: ThemePreference]
}>()
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': isCollapsed }" aria-label="工具選單">
    <div class="sidebar__brand">
      <span class="sidebar__mark" aria-hidden="true">
        <img src="/brand/hestiakit-icon-b.png" alt="" />
      </span>
      <p class="sidebar__name">HestiaKit</p>
      <button
        class="sidebar__collapse"
        type="button"
        :aria-label="isCollapsed ? '展開功能列' : '收合功能列'"
        :title="isCollapsed ? '展開功能列' : '收合功能列'"
        @click="emit('update:isCollapsed', !isCollapsed)"
      >
        <span class="sidebar__hamburger" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    </div>

    <nav class="sidebar__nav">
      <RouterLink
        v-for="tool in tools"
        :key="tool.name"
        class="sidebar__link"
        :aria-label="tool.label"
        :title="isCollapsed ? tool.label : undefined"
        :to="{ name: tool.name }"
      >
        <span class="sidebar__link-icon" aria-hidden="true">{{ tool.icon }}</span>
        <span class="sidebar__link-label">{{ tool.label }}</span>
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
  align-self: start;
  height: 100svh;
  max-height: 100svh;
  min-height: 100svh;
  grid-template-rows: auto 1fr auto;
  gap: var(--space-6);
  overflow: hidden;
  padding: var(--space-6);
  border-right: 1px solid var(--color-border);
  background:
    radial-gradient(circle at 20% 0%, var(--color-brand-glow), transparent 32%),
    var(--color-sidebar);
}

.sidebar__brand {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.sidebar__mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
}

.sidebar__mark img {
  width: 42px;
  height: 42px;
  display: block;
}

.sidebar__name {
  margin: 0;
}

.sidebar__name {
  color: var(--color-text-strong);
  font-weight: 800;
  letter-spacing: 0;
}

.sidebar__collapse {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-strong);
  background: var(--color-surface);
  font: inherit;
  cursor: pointer;
}

.sidebar__collapse:hover {
  color: var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.sidebar__collapse:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.sidebar__hamburger {
  position: relative;
  display: grid;
  width: 18px;
  height: 14px;
  align-content: space-between;
}

.sidebar__hamburger span {
  display: block;
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
  overflow-y: auto;
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

.sidebar--collapsed {
  gap: 0;
  padding: var(--space-3);
}

.sidebar--collapsed .sidebar__brand {
  grid-template-columns: 1fr;
  justify-items: center;
}

.sidebar--collapsed .sidebar__name,
.sidebar--collapsed .sidebar__mark,
.sidebar--collapsed .sidebar__nav,
.sidebar--collapsed .sidebar__theme {
  display: none;
}

.sidebar--collapsed .sidebar__collapse {
  width: 40px;
  height: 40px;
}

@media (max-width: 860px) {
  .sidebar {
    position: static;
    height: auto;
    max-height: none;
    min-height: auto;
    grid-template-columns: 1fr;
    gap: var(--space-4);
    overflow: visible;
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
