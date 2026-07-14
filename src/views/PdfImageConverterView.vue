<script setup lang="ts">
import { ref } from 'vue'
import {
  ArchiveIcon,
  CircleAlertIcon,
  DownloadIcon,
  FileImageIcon,
  ImagesIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from '@lucide/vue'
import RangeControl from '@/components/forms/RangeControl.vue'
import SegmentedControl from '@/components/forms/SegmentedControl.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePdfImageConverter } from '@/composables/usePdfImageConverter'
import { formatPdfFileSize } from '@/utils/pdfImageConverter'

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const {
  archiveState,
  canConvert,
  cancelConversion,
  clearFile,
  clearResults,
  conversionMessage,
  conversionState,
  convert,
  documentMessage,
  documentState,
  documentStateLabel,
  downloadAll,
  downloadResult,
  dpi,
  dpiOptions,
  format,
  formatOptions,
  isBusy,
  jpegQuality,
  pageCount,
  pageRange,
  pageSelectionIssue,
  pageSelectionMode,
  pageSelectionOptions,
  password,
  progressCompleted,
  progressPercent,
  progressTotal,
  results,
  selectFile,
  selectedFile,
  selectedPageCount,
  unlockDocument,
} = usePdfImageConverter()

function openFilePicker() {
  if (!isBusy.value) {
    fileInput.value?.click()
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    await selectFile(file)
  }

  input.value = ''
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]

  if (file && !isBusy.value) {
    await selectFile(file)
  }
}

</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">PDF 轉圖片</h1>
      <p class="text-sm text-muted-foreground">將每一頁轉成 PNG 或 JPG；檔案只在這個瀏覽器分頁內處理。</p>
    </header>

    <Card>
      <CardHeader class="border-b px-4 pb-4 sm:px-5">
        <div class="flex items-center gap-3">
          <span class="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileImageIcon class="size-4" />
          </span>
          <div>
            <CardTitle>選擇 PDF</CardTitle>
            <CardDescription>支援本機 PDF，單一檔案上限 100 MB。</CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge
            :variant="documentState === 'failed' ? 'destructive' : documentState === 'ready' ? 'secondary' : 'outline'"
          >
            <LoaderCircleIcon v-if="documentState === 'loading'" class="animate-spin" />
            <LockKeyholeIcon v-else-if="documentState === 'password-required'" />
            <FileImageIcon v-else />
            {{ documentStateLabel }}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent class="grid gap-4 px-4 sm:px-5">
        <button
          type="button"
          class="group grid min-h-44 w-full place-items-center rounded-xl border border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          :class="[
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/40',
            isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          ]"
          :disabled="isBusy"
          @click="openFilePicker"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <span class="grid justify-items-center gap-3">
            <span class="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform group-hover:scale-105">
              <LoaderCircleIcon v-if="documentState === 'loading'" class="size-5 animate-spin" />
              <UploadIcon v-else class="size-5" />
            </span>
            <span>
              <span class="block font-medium">拖曳 PDF 到這裡，或點一下選擇檔案</span>
              <span class="mt-1 block text-sm text-muted-foreground">不會上傳到伺服器</span>
            </span>
          </span>
        </button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept=".pdf,application/pdf"
          aria-label="選擇 PDF 檔案"
          @change="handleFileChange"
        />

        <div v-if="selectedFile" class="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3">
          <FileImageIcon class="size-5 shrink-0 text-muted-foreground" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ selectedFile.name }}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ formatPdfFileSize(selectedFile.size) }}<template v-if="pageCount"> · {{ pageCount }} 頁</template>
            </p>
          </div>
          <Button variant="ghost" size="icon" :disabled="isBusy" aria-label="移除 PDF" title="移除 PDF" @click="clearFile">
            <XIcon />
          </Button>
        </div>

        <form
          v-if="documentState === 'password-required'"
          class="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          @submit.prevent="unlockDocument"
        >
          <label class="grid gap-2 text-sm font-medium">
            PDF 開啟密碼
            <Input v-model="password" type="password" autocomplete="current-password" />
          </label>
          <Button type="submit" :disabled="!password">
            <LockKeyholeIcon />
            開啟 PDF
          </Button>
          <p v-if="documentMessage" class="text-sm text-muted-foreground sm:col-span-2" aria-live="polite">
            {{ documentMessage }}
          </p>
        </form>

        <Alert
          v-if="(documentState === 'failed' && documentMessage) || ((conversionState === 'failed' || archiveState === 'failed') && conversionMessage)"
          variant="destructive"
        >
          <CircleAlertIcon />
          <AlertTitle>無法完成操作</AlertTitle>
          <AlertDescription>{{ documentState === 'failed' ? documentMessage : conversionMessage }}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>

    <Card :class="documentState !== 'ready' ? 'opacity-70' : ''">
      <CardHeader class="border-b px-4 pb-4 sm:px-5">
        <CardTitle>輸出設定</CardTitle>
        <CardDescription>高 DPI 會產生較大的圖片，也會使用更多瀏覽器記憶體。</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6 px-4 sm:px-5 lg:grid-cols-2">
        <SegmentedControl v-model="format" label="圖片格式" :options="formatOptions" />
        <SegmentedControl v-model="dpi" label="輸出解析度" :options="dpiOptions" />
        <SegmentedControl v-model="pageSelectionMode" label="頁面" :options="pageSelectionOptions" />

        <div v-if="pageSelectionMode === 'range'" class="grid content-start gap-2">
          <label for="pdf-page-range" class="text-sm font-medium">頁碼範圍</label>
          <Input
            id="pdf-page-range"
            v-model="pageRange"
            placeholder="例如 1-3, 5"
            :aria-invalid="Boolean(pageSelectionIssue)"
            :disabled="documentState !== 'ready'"
          />
          <p v-if="pageSelectionIssue" class="text-xs text-destructive">{{ pageSelectionIssue }}</p>
          <p v-else class="text-xs text-muted-foreground">可使用逗號與連續範圍。</p>
        </div>
        <div v-else class="grid content-start gap-2 rounded-lg bg-muted/50 p-4">
          <span class="text-sm font-medium">預計輸出</span>
          <span v-if="pageSelectionIssue" class="text-sm text-destructive">{{ pageSelectionIssue }}</span>
          <template v-else>
            <span class="text-2xl font-semibold tabular-nums">{{ selectedPageCount }}</span>
            <span class="text-xs text-muted-foreground">張圖片</span>
          </template>
        </div>

        <RangeControl
          v-if="format === 'jpeg'"
          v-model="jpegQuality"
          class="lg:col-span-2"
          label="JPG 品質"
          :min="50"
          :max="100"
          suffix="%"
        />
      </CardContent>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-4 sm:px-5">
        <p class="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon class="size-4 text-emerald-600" />
          逐頁在本機轉換，不傳送檔案或密碼。
        </p>
        <div class="flex gap-2">
          <Button v-if="conversionState === 'converting'" variant="outline" @click="cancelConversion">
            <XIcon />
            取消
          </Button>
          <Button v-else :disabled="!canConvert" @click="convert">
            <ImagesIcon />
            轉換 {{ selectedPageCount }} 頁
          </Button>
        </div>
      </div>
    </Card>

    <Card v-if="conversionState !== 'idle' || results.length > 0">
      <CardHeader class="border-b px-4 pb-4 sm:px-5">
        <div>
          <CardTitle>轉換結果</CardTitle>
          <CardDescription>
            <template v-if="conversionState === 'converting'">正在處理第 {{ progressCompleted + 1 }} 頁，共 {{ progressTotal }} 頁。</template>
            <template v-else>已產生 {{ results.length }} 張圖片。</template>
          </CardDescription>
        </div>
        <CardAction class="flex gap-2">
          <Button variant="outline" size="icon" :disabled="results.length === 0 || conversionState === 'converting'" aria-label="清除結果" title="清除結果" @click="clearResults">
            <Trash2Icon />
          </Button>
          <Button :disabled="results.length === 0 || archiveState === 'preparing'" @click="downloadAll">
            <LoaderCircleIcon v-if="archiveState === 'preparing'" class="animate-spin" />
            <ArchiveIcon v-else-if="results.length > 1" />
            <DownloadIcon v-else />
            {{ archiveState === 'preparing' ? '建立 ZIP…' : results.length > 1 ? '下載 ZIP' : '下載圖片' }}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent class="grid gap-5 px-4 sm:px-5">
        <div v-if="conversionState === 'converting'" class="grid gap-2" aria-live="polite">
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>{{ progressCompleted }} / {{ progressTotal }}</span>
            <span>{{ progressPercent }}%</span>
          </div>
          <div
            class="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="h-full rounded-full bg-primary transition-[width]" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <p v-if="conversionMessage && (conversionState === 'completed' || conversionState === 'cancelled')" class="text-sm text-muted-foreground" aria-live="polite">
          {{ conversionMessage }}
        </p>

        <div v-if="results.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article v-for="result in results" :key="result.pageNumber" class="min-w-0 overflow-hidden rounded-xl border bg-card">
            <div class="grid aspect-[4/3] place-items-center overflow-hidden bg-muted/40 p-3">
              <img
                :src="result.url"
                :alt="`PDF 第 ${result.pageNumber} 頁轉換結果`"
                class="max-h-full max-w-full rounded-sm object-contain shadow-sm"
                loading="lazy"
              />
            </div>
            <div class="grid gap-3 border-t p-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium" :title="result.filename">{{ result.filename }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ result.width.toLocaleString('zh-TW') }} × {{ result.height.toLocaleString('zh-TW') }} px · {{ formatPdfFileSize(result.blob.size) }}
                </p>
              </div>
              <Button variant="outline" class="w-full" @click="downloadResult(result)">
                <DownloadIcon />
                下載第 {{ result.pageNumber }} 頁
              </Button>
            </div>
          </article>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
