<script setup lang="ts">
import SidebarNav from '../components/navigation/SidebarNav.vue'
import { useTheme } from '../composables/useTheme'

const { preference, setTheme } = useTheme()
</script>

<template>
  <div class="app-shell">
    <SidebarNav :theme-preference="preference" @update:theme-preference="setTheme" />

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
}

.app-shell__main {
  min-width: 0;
  padding: var(--space-8);
}

@media (max-width: 860px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-shell__main {
    padding: var(--space-4);
  }
}
</style>
