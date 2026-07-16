<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  Trash2Icon,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Base64HistoryRecord } from '@/composables/useBase64'

const props = defineProps<{
  history: Base64HistoryRecord[]
}>()

const emit = defineEmits<{
  clear: []
  delete: [recordId: string]
  load: [record: Base64HistoryRecord]
}>()

const isPointerInside = ref(false)
const isFocusWithin = ref(false)
const isPointerInteraction = ref(false)
const isTouchOpen = ref(false)
const railButton = ref<HTMLButtonElement | null>(null)

const isExpanded = computed(
  () => isPointerInside.value || isFocusWithin.value || isTouchOpen.value,
)

function formatRecordDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getOperationLabel(record: Base64HistoryRecord) {
  return record.operation === 'encode' ? '編碼' : '解碼'
}

function getAlphabetLabel(record: Base64HistoryRecord) {
  return record.alphabet === 'url-safe' ? 'URL-safe' : '標準'
}

function handlePointerEnter() {
  isPointerInside.value = true
}

function handlePointerLeave() {
  isPointerInside.value = false
}

function handlePointerDown() {
  isPointerInteraction.value = true
  isFocusWithin.value = false
}

function handlePointerEnd() {
  isPointerInteraction.value = false
}

function handleFocusIn() {
  if (!isPointerInteraction.value) {
    isFocusWithin.value = true
  }
}

function handleFocusOut(event: FocusEvent) {
  const drawer = event.currentTarget as HTMLElement
  const nextTarget = event.relatedTarget

  if (!(nextTarget instanceof Node) || !drawer.contains(nextTarget)) {
    isFocusWithin.value = false
  }
}

function collapseDrawer() {
  isTouchOpen.value = false
  railButton.value?.blur()
}

function toggleTouchDrawer() {
  if (window.matchMedia?.('(hover: none)').matches) {
    isTouchOpen.value = !isTouchOpen.value
  }
}
</script>

<template>
  <Teleport to="body">
    <aside
      class="fixed top-2 right-2 bottom-2 z-40 flex w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border bg-card/95 text-card-foreground shadow-2xl backdrop-blur transition-transform duration-200 ease-out motion-reduce:transition-none sm:top-4 sm:right-4 sm:bottom-4 sm:w-[22rem]"
      :style="{ transform: isExpanded ? 'translateX(0)' : 'translateX(calc(100% - 3.25rem))' }"
      aria-label="轉換紀錄"
      @mouseenter="handlePointerEnter"
      @mouseleave="handlePointerLeave"
      @pointerdown.capture="handlePointerDown"
      @pointerup.capture="handlePointerEnd"
      @pointercancel.capture="handlePointerEnd"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
      @keydown.esc.stop="collapseDrawer"
    >
      <button
        ref="railButton"
        type="button"
        class="flex w-13 shrink-0 flex-col items-center justify-center gap-3 border-r bg-muted/60 px-2 py-4 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
        :aria-controls="'base64-history-drawer-content'"
        :aria-expanded="isExpanded"
        aria-label="轉換紀錄"
        title="滑入展開轉換紀錄"
        @click="toggleTouchDrawer"
      >
        <HistoryIcon class="size-4" />
        <span class="rotate-180 text-xs font-medium tracking-[0.18em] [writing-mode:vertical-rl]">轉換紀錄</span>
        <span class="flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 py-0.5 font-mono text-[0.65rem] text-foreground">
          {{ props.history.length }}
        </span>
        <ChevronRightIcon v-if="isExpanded" class="size-4" />
        <ChevronLeftIcon v-else class="size-4" />
      </button>

      <div
        id="base64-history-drawer-content"
        class="flex min-w-0 flex-1 flex-col"
        :aria-hidden="!isExpanded"
        :inert="!isExpanded"
      >
        <header class="flex items-center justify-between gap-3 border-b px-4 py-4">
          <div class="min-w-0">
            <h2 class="font-semibold text-foreground">轉換紀錄</h2>
            <p class="mt-1 text-xs text-muted-foreground">{{ props.history.length }} 筆本機紀錄</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            :disabled="props.history.length === 0"
            @click="emit('clear')"
          >
            <Trash2Icon />
            全部刪除
          </Button>
        </header>

        <ScrollArea class="min-h-0 flex-1">
          <div v-if="props.history.length === 0" class="grid min-h-40 place-items-center px-4 text-sm text-muted-foreground">
            尚無紀錄
          </div>
          <div v-else class="divide-y px-3">
            <article v-for="record in props.history" :key="record.id" class="flex items-start gap-1 py-3">
              <Button
                variant="ghost"
                class="h-auto min-w-0 flex-1 justify-start whitespace-normal px-2 py-2 text-left"
                @click="emit('load', record)"
              >
                <span class="grid min-w-0 flex-1 gap-2">
                  <span class="text-xs text-muted-foreground">
                    {{ getOperationLabel(record) }} · {{ getAlphabetLabel(record) }} · {{ formatRecordDate(record.createdAt) }}
                  </span>
                  <span class="grid min-w-0 gap-1 font-mono text-xs">
                    <span class="flex min-w-0 gap-2">
                      <span class="shrink-0 text-muted-foreground">輸入</span>
                      <span class="truncate">{{ record.input }}</span>
                    </span>
                    <span class="flex min-w-0 gap-2">
                      <span class="shrink-0 text-muted-foreground">輸出</span>
                      <span class="truncate">{{ record.output }}</span>
                    </span>
                  </span>
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="刪除紀錄"
                title="刪除紀錄"
                @click="emit('delete', record.id)"
              >
                <Trash2Icon />
              </Button>
            </article>
          </div>
        </ScrollArea>
      </div>
    </aside>
  </Teleport>
</template>
