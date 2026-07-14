<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { ShieldCheckIcon } from '@lucide/vue'
import ThemeToggle from '@/components/theme/ThemeToggle.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import type { AppliedTheme, DarkAccentPreference, ThemePreference } from '@/composables/useTheme'
import { toolCategories, tools } from '@/tools'

defineProps<{
  accentPreference: DarkAccentPreference
  appliedTheme: AppliedTheme
  themePreference: ThemePreference
}>()

const emit = defineEmits<{
  'update:accentPreference': [preference: DarkAccentPreference]
  'update:themePreference': [preference: ThemePreference]
}>()

const route = useRoute()
const { setOpenMobile } = useSidebar()
const brandIconUrl = `${import.meta.env.BASE_URL}brand/hestiakit-icon-b.png`

watch(
  () => route.fullPath,
  () => setOpenMobile(false),
)
</script>

<template>
  <Sidebar variant="inset" collapsible="icon" aria-label="工具選單">
    <SidebarHeader class="border-b border-sidebar-border/70 p-3">
      <div class="flex items-center gap-1 group-data-[collapsible=icon]:justify-center">
        <SidebarMenu class="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" as-child tooltip="HestiaKit">
              <RouterLink :to="{ name: 'password-generator' }">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <img :src="brandIconUrl" alt="" class="size-7" />
                </span>
                <span class="grid min-w-0 flex-1 text-left leading-tight">
                  <span class="truncate font-semibold">HestiaKit</span>
                  <span class="truncate text-xs text-muted-foreground">隱私優先工具箱</span>
                </span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger class="shrink-0" aria-label="收合或展開功能列" title="收合或展開功能列" />
      </div>
    </SidebarHeader>

    <SidebarContent class="py-2">
      <SidebarGroup v-for="category in toolCategories" :key="category.id">
        <SidebarGroupLabel>{{ category.label }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="tool in tools.filter((item) => item.categoryId === category.id)" :key="tool.name">
              <SidebarMenuButton
                as-child
                :is-active="route.name === tool.name"
                :tooltip="tool.label"
                class="h-9"
              >
                <RouterLink :to="{ name: tool.name }">
                  <component :is="tool.icon" />
                  <span>{{ tool.label }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="gap-3 border-t border-sidebar-border/70 p-3">
      <div class="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 p-2 group-data-[collapsible=icon]:hidden">
        <ShieldCheckIcon class="size-4 shrink-0 text-sidebar-primary" />
        <p class="text-xs leading-relaxed text-muted-foreground">資料不會離開這台裝置</p>
      </div>
      <ThemeToggle
        :accent-preference="accentPreference"
        :applied-theme="appliedTheme"
        :model-value="themePreference"
        @update:accent-preference="emit('update:accentPreference', $event)"
        @update:model-value="emit('update:themePreference', $event)"
      />
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
