<script setup lang="ts">
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import {
  ArrowDownIcon,
  LayersIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { PdfConversionRiskEstimate } from '@/utils/pdfImageConverter'

const props = defineProps<{
  canContinue: boolean
  canReduceDpi: boolean
  canSplit: boolean
  estimate: PdfConversionRiskEstimate | null
  open: boolean
}>()

const emit = defineEmits<{
  continue: []
  dismiss: []
  reduceDpi: []
  split: []
}>()

function handleOpenChange(open: boolean) {
  if (!open && props.open) {
    emit('dismiss')
  }
}
</script>

<template>
  <AlertDialogRoot v-if="open" :open="open" @update:open="handleOpenChange">
    <AlertDialogPortal>
      <AlertDialogOverlay
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <AlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border bg-background p-5 shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-6"
      >
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-3 top-3"
          aria-label="關閉轉換風險提示"
          title="返回設定"
          @click="emit('dismiss')"
        >
          <XIcon />
        </Button>

        <div class="flex items-start gap-3 pr-9">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <TriangleAlertIcon class="size-5" />
          </span>
          <div class="grid gap-1.5">
            <AlertDialogTitle class="text-lg font-semibold">
              {{ estimate?.exceedsCanvasLimit ? '目前設定超過瀏覽器上限' : '此次轉換規模較大' }}
            </AlertDialogTitle>
            <AlertDialogDescription class="text-sm leading-6 text-muted-foreground">
              <template v-if="estimate?.exceedsCanvasLimit">
                至少一頁超過瀏覽器可建立的圖片容量，請降低 DPI 後再轉換。
              </template>
              <template v-else>
                可能造成瀏覽器卡頓、分頁重新載入或轉換結果遺失。是否仍要繼續？
              </template>
            </AlertDialogDescription>
          </div>
        </div>

        <template v-if="estimate">
          <dl class="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border text-center">
            <div class="grid gap-1 bg-muted/50 p-3">
              <dt class="text-xs text-muted-foreground">頁數</dt>
              <dd class="font-semibold tabular-nums">{{ estimate.pageCount }}</dd>
            </div>
            <div class="grid gap-1 bg-muted/50 p-3">
              <dt class="text-xs text-muted-foreground">解析度</dt>
              <dd class="font-semibold tabular-nums">{{ estimate.dpi }} DPI</dd>
            </div>
            <div class="grid gap-1 bg-muted/50 p-3">
              <dt class="text-xs text-muted-foreground">預估像素</dt>
              <dd class="font-semibold tabular-nums">{{ estimate.totalPixels.toLocaleString('zh-TW') }}</dd>
            </div>
          </dl>

          <ul class="grid gap-2 text-sm text-muted-foreground">
            <li v-if="estimate.exceedsPageCount" class="flex gap-2">
              <span aria-hidden="true">•</span>
              頁數超過建議的單批 20 頁。
            </li>
            <li v-if="estimate.exceedsBatchPixels" class="flex gap-2">
              <span aria-hidden="true">•</span>
              整批預估像素超過 100,000,000。
            </li>
            <li v-if="estimate.exceedsSinglePagePixels" class="flex gap-2">
              <span aria-hidden="true">•</span>
              至少一頁超過建議的單頁 34,000,000 像素。
            </li>
            <li v-if="estimate.exceedsCanvasLimit" class="flex gap-2 font-medium text-destructive">
              <span aria-hidden="true">•</span>
              至少一頁超過瀏覽器 Canvas 的已知技術上限，無法強制繼續。
            </li>
            <li v-if="canSplit" class="flex gap-2 font-medium text-foreground">
              <span aria-hidden="true">•</span>
              可自動分成 {{ estimate.suggestedBatches.length }} 批；每批完成後會釋放 PDF 資源再接續。
            </li>
          </ul>
        </template>

        <div class="grid gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            :disabled="!canReduceDpi"
            :title="canReduceDpi ? '使用下一個較低的解析度' : '目前已是最低解析度'"
            @click="emit('reduceDpi')"
          >
            <ArrowDownIcon />
            降低 DPI
          </Button>
          <Button
            variant="outline"
            :disabled="!canSplit"
            :title="canSplit ? `依序執行 ${estimate?.suggestedBatches.length ?? 0} 個安全批次` : '目前無法分割成較安全的批次'"
            @click="emit('split')"
          >
            <LayersIcon />
            分批轉換<span v-if="canSplit">（{{ estimate?.suggestedBatches.length }} 批）</span>
          </Button>
          <Button
            :disabled="!canContinue"
            :title="canContinue ? '接受風險並開始轉換' : '請先降低 DPI'"
            @click="emit('continue')"
          >
            <TriangleAlertIcon />
            仍要繼續
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
