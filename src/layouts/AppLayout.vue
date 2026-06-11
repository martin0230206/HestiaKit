<script setup lang="ts">
import { ref, watch } from 'vue'
import SidebarNav from '../components/navigation/SidebarNav.vue'
import { useTheme } from '../composables/useTheme'

const { preference, setTheme } = useTheme()
const sidebarCollapsedStorageKey = 'hestiakit-sidebar-collapsed'

function readSidebarCollapsedState() {
  try {
    return window.localStorage.getItem(sidebarCollapsedStorageKey) === 'true'
  } catch {
    return false
  }
}

const isSidebarCollapsed = ref(readSidebarCollapsedState())

watch(isSidebarCollapsed, (isCollapsed) => {
  try {
    window.localStorage.setItem(sidebarCollapsedStorageKey, String(isCollapsed))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
})
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--sidebar-collapsed': isSidebarCollapsed }">
    <SidebarNav
      :is-collapsed="isSidebarCollapsed"
      :theme-preference="preference"
      @update:isCollapsed="isSidebarCollapsed = $event"
      @update:theme-preference="setTheme"
    />

    <main class="app-shell__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  min-height: 100svh;
  grid-template-columns: 292px minmax(0, 1fr);
  background: var(--color-bg);
  transition: grid-template-columns 0.18s ease;
}

.app-shell--sidebar-collapsed {
  grid-template-columns: 64px minmax(0, 1fr);
}

.app-shell__main {
  min-width: 0;
  padding: var(--space-8);
}

@media (max-width: 860px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-shell--sidebar-collapsed {
    grid-template-columns: 1fr;
  }

  .app-shell__main {
    padding: var(--space-4);
  }
}
</style>
