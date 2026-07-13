<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNav from '@/components/navigation/SidebarNav.vue'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useTheme } from '@/composables/useTheme'
import { tools } from '@/tools'

const { accentPreference, appliedTheme, preference, setAccent, setTheme } = useTheme()
const route = useRoute()
const sidebarCollapsedStorageKey = 'hestiakit-sidebar-collapsed'

function readSidebarOpenState() {
  try {
    return window.localStorage.getItem(sidebarCollapsedStorageKey) !== 'true'
  } catch {
    return true
  }
}

const isSidebarOpen = ref(readSidebarOpenState())
const currentToolLabel = computed(
  () => tools.find((tool) => tool.name === route.name)?.label ?? 'HestiaKit',
)

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
      <header class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl">
        <SidebarTrigger aria-label="切換功能列" title="切換功能列" />
        <div class="h-4 w-px bg-border" aria-hidden="true"></div>
        <p class="truncate text-sm font-medium text-foreground">{{ currentToolLabel }}</p>
        <span class="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <span class="size-1.5 rounded-full bg-emerald-500"></span>
          所有資料僅在瀏覽器處理
        </span>
      </header>

      <div class="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <RouterView />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
