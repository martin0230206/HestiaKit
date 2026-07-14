<script setup lang="ts">
import { ref, watch } from 'vue'
import SidebarNav from '@/components/navigation/SidebarNav.vue'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useTheme } from '@/composables/useTheme'

const { accentPreference, appliedTheme, preference, setAccent, setTheme } = useTheme()
const sidebarCollapsedStorageKey = 'hestiakit-sidebar-collapsed'

function readSidebarOpenState() {
  try {
    return window.localStorage.getItem(sidebarCollapsedStorageKey) !== 'true'
  } catch {
    return true
  }
}

const isSidebarOpen = ref(readSidebarOpenState())
watch(isSidebarOpen, (isOpen) => {
  try {
    window.localStorage.setItem(sidebarCollapsedStorageKey, String(!isOpen))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
})
</script>

<template>
  <SidebarProvider v-model:open="isSidebarOpen" class="bg-sidebar">
    <SidebarNav
      :accent-preference="accentPreference"
      :applied-theme="appliedTheme"
      :theme-preference="preference"
      @update:accent-preference="setAccent"
      @update:theme-preference="setTheme"
    />

    <SidebarInset class="min-w-0 overflow-hidden border border-border/70">
      <SidebarTrigger
        class="fixed bottom-4 left-4 z-30 border bg-background/90 shadow-md backdrop-blur md:hidden"
        aria-label="切換功能列"
        title="切換功能列"
      />

      <div class="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <RouterView />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
