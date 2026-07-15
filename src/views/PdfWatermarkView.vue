<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  CircleAlertIcon,
  DownloadIcon,
  FileImageIcon,
  FileOutputIcon,
  FileTextIcon,
  ImageIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from '@lucide/vue'
import RangeControl from '@/components/forms/RangeControl.vue'
import SegmentedControl from '@/components/forms/SegmentedControl.vue'
import WatermarkPreview from '@/components/pdf-watermark/WatermarkPreview.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePdfWatermark } from '@/composables/usePdfWatermark'
import { formatPdfFileSize } from '@/utils/pdfImageConverter'
import {
  PDF_WATERMARK_TEXT_MAX_CHARACTERS,
  PDF_WATERMARK_TEXT_MAX_LINES,
} from '@/utils/pdfWatermark'

const fileInput = ref<HTMLInputElement | null>(null)
const watermarkImageInput = ref<HTMLInputElement | null>(null)
const resultHeading = ref<HTMLElement | null>(null)
const isDragging = ref(false)
let dragDepth = 0

const {
  cancelGeneration,
  canGenerate,
  clearFile,
  clearWatermarkImage,
  documentMessage,
  documentState,
  digitalSignatureState,
  generate,
  generationMessage,
  generationStage,
  generationState,
  hasDigitalSignatures,
  horizontalSpacingPercent,
  layout,
  opacityPercent,
  pageCount,
  pageRange,
  pageSelectionIssue,
  pageSelectionMode,
  previewAspectRatio,
  previewBaseUrl,
  previewMessage,
  previewPageNumber,
  previewState,
  progressCompleted,
  progressPercent,
  progressTotal,
  resetSettings,
  result,
  resultIsStale,
  rotation,
  selectWatermarkImage,
  setPreviewPage,
  selectedPageCount,
  selectedPages,
  selectFile,
  selectedFile,
  settingsIssue,
  sizePercent,
  verticalSpacingPercent,
  watermarkColor,
  watermarkImageDimensions,
  watermarkImageFile,
  watermarkImageMessage,
  watermarkImageUrl,
  watermarkKind,
  watermarkText,
  watermarkTextCharacterCount,
  watermarkTextIssue,
  watermarkTextLineCount,
} = usePdfWatermark()

const watermarkKindOptions: Array<{ label: string; value: 'text' | 'image' }> = [
  { label: '文字', value: 'text' },
  { label: 'PNG／JPEG 圖片', value: 'image' },
]
const layoutOptions: Array<{ label: string; value: 'center' | 'tile' }> = [
  { label: '置中', value: 'center' },
  { label: '平鋪', value: 'tile' },
]
const pageSelectionOptions: Array<{ label: string; value: 'all' | 'range' }> = [
  { label: '全部頁面', value: 'all' },
  { label: '指定頁碼', value: 'range' },
]

const isBusy = computed(
  () => documentState.value === 'loading' || generationState.value === 'running',
)
const settingsDisabled = computed(
  () => documentState.value !== 'ready' || generationState.value === 'running',
)
const isPreviewPageSelected = computed(() =>
  selectedPages.value.includes(previewPageNumber.value),
)
const documentStateLabel = computed(() => {
  switch (documentState.value) {
    case 'loading':
      return digitalSignatureState.value === 'checking' ? '檢查簽章' : '讀取中'
    case 'ready':
      return `${pageCount.value} 頁`
    case 'unsupported-protected':
      return '不支援加密'
    case 'failed':
      return '讀取失敗'
    default:
      return '尚未選擇'
  }
})
const documentBadgeVariant = computed<'destructive' | 'outline' | 'secondary'>(() => {
  if (documentState.value === 'failed' || documentState.value === 'unsupported-protected') {
    return 'destructive'
  }
  return documentState.value === 'ready' ? 'secondary' : 'outline'
})
const generationStageLabel = computed(() => {
  switch (generationStage.value) {
    case 'preparing':
      return '正在準備 PDF 與浮水印資料…'
    case 'applying':
      return '正在加入浮水印…'
    case 'saving':
      return '正在建立輸出 PDF…'
    default:
      return '正在處理 PDF…'
  }
})

watch(generationState, async (state) => {
  if (state === 'completed' && result.value) {
    await nextTick()
    resultHeading.value?.focus()
  }
})

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

function handleDragEnter() {
  if (isBusy.value) return
  dragDepth += 1
  isDragging.value = true
}

function handleDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    isDragging.value = false
  }
}

async function handleDrop(event: DragEvent) {
  dragDepth = 0
  isDragging.value = false
  const file = event.dataTransfer?.files[0]

  if (file && !isBusy.value) {
    await selectFile(file)
  }
}

function openWatermarkImagePicker() {
  if (!settingsDisabled.value) {
    watermarkImageInput.value?.click()
  }
}

async function handleWatermarkImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    await selectWatermarkImage(file)
  }

  input.value = ''
}

function removeWatermarkImage() {
  clearWatermarkImage()
  if (watermarkImageInput.value) {
    watermarkImageInput.value.value = ''
  }
}
</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">PDF 增加浮水印</h1>
      <p class="text-sm text-muted-foreground">
        在瀏覽器內加入文字或圖片浮水印；匯出檔案仍是 PDF，不會上傳檔案或浮水印內容。
      </p>
    </header>

    <Card>
      <CardHeader class="border-b px-4 pb-4 sm:px-5">
        <div class="flex items-center gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileTextIcon class="size-4" />
          </span>
          <div class="min-w-0">
            <CardTitle>選擇 PDF</CardTitle>
            <CardDescription>支援單一未加密的本機 PDF，檔案上限 50 MB。</CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge :variant="documentBadgeVariant">
            <LoaderCircleIcon
              v-if="documentState === 'loading'"
              class="animate-spin motion-reduce:animate-none"
            />
            <LockKeyholeIcon v-else-if="documentState === 'unsupported-protected'" />
            <FileTextIcon v-else />
            {{ documentStateLabel }}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent class="grid gap-4 px-4 sm:px-5">
        <button
          type="button"
          class="group grid min-h-40 w-full place-items-center rounded-xl border border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          :class="[
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/40',
            isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          ]"
          :disabled="isBusy"
          aria-describedby="pdf-watermark-file-privacy"
          @click="openFilePicker"
          @dragenter.prevent="handleDragEnter"
          @dragover.prevent
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <span class="grid justify-items-center gap-3">
            <span class="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform group-hover:scale-105 motion-reduce:transition-none">
              <LoaderCircleIcon
                v-if="documentState === 'loading'"
                class="size-5 animate-spin motion-reduce:animate-none"
              />
              <UploadIcon v-else class="size-5" />
            </span>
            <span>
              <span class="block font-medium">拖曳 PDF 到這裡，或點一下選擇檔案</span>
              <span id="pdf-watermark-file-privacy" class="mt-1 block text-sm text-muted-foreground">
                所有處理都在目前的瀏覽器分頁內完成
              </span>
            </span>
          </span>
        </button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept=".pdf,application/pdf"
          aria-label="選擇要加入浮水印的 PDF"
          @change="handleFileChange"
        />

        <div v-if="selectedFile" class="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3">
          <FileTextIcon class="size-5 shrink-0 text-muted-foreground" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :title="selectedFile.name">{{ selectedFile.name }}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ formatPdfFileSize(selectedFile.size) }}<template v-if="pageCount"> · {{ pageCount }} 頁</template>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :disabled="isBusy"
            aria-label="移除 PDF"
            title="移除 PDF"
            @click="clearFile"
          >
            <XIcon />
          </Button>
        </div>

        <Alert
          v-if="documentState === 'unsupported-protected'"
          variant="destructive"
        >
          <LockKeyholeIcon />
          <AlertTitle>目前不支援加密 PDF</AlertTitle>
          <AlertDescription>
            {{ documentMessage || '這份 PDF 需要密碼或受到加密保護。' }} 請改用未加密的副本。
          </AlertDescription>
        </Alert>

        <Alert v-else-if="documentState === 'failed' && documentMessage" variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>無法讀取 PDF</AlertTitle>
          <AlertDescription>{{ documentMessage }}</AlertDescription>
        </Alert>

        <Alert v-if="hasDigitalSignatures" variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>這份 PDF 含有數位簽章</AlertTitle>
          <AlertDescription>
            加入浮水印會修改文件；原有簽章可能失效或顯示文件已變更。本工具不保證保留任何簽章或認證狀態。
          </AlertDescription>
        </Alert>

        <Alert v-else-if="digitalSignatureState === 'possible'" variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>這份 PDF 可能含有數位簽章</AlertTitle>
          <AlertDescription>
            偵測到 ByteRange 或 DocMDP 簽章標記，但無法確認完整簽章欄位。加入浮水印後，原有簽章可能失效或顯示文件已變更。
          </AlertDescription>
        </Alert>

        <Alert v-else-if="digitalSignatureState === 'unknown'" variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>無法確認這份 PDF 的簽章狀態</AlertTitle>
          <AlertDescription>
            簽章欄位掃描失敗；若文件原本有數位簽章，加入浮水印後可能失效或顯示文件已變更。請將輸出視為新的副本並再次確認。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>

    <div class="grid gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start">
      <Card :class="documentState !== 'ready' ? 'opacity-75' : ''">
        <CardHeader class="border-b px-4 pb-4 sm:px-5">
          <div class="flex items-center gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FileImageIcon class="size-4" />
            </span>
            <div>
              <CardTitle>浮水印設定</CardTitle>
              <CardDescription>設定會立即反映在右側近似預覽。</CardDescription>
            </div>
          </div>
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :disabled="generationState === 'running'"
              @click="resetSettings"
            >
              <RotateCcwIcon />
              重置
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent class="px-4 sm:px-5">
          <fieldset class="grid gap-6" :disabled="settingsDisabled">
            <legend class="sr-only">PDF 浮水印設定</legend>

            <SegmentedControl
              v-model="watermarkKind"
              label="浮水印類型"
              :options="watermarkKindOptions"
              :disabled="settingsDisabled"
            />

            <div v-if="watermarkKind === 'text'" class="grid gap-4">
              <label class="grid gap-2 text-sm font-medium" for="pdf-watermark-text">
                浮水印文字
                <Textarea
                  id="pdf-watermark-text"
                  v-model="watermarkText"
                  rows="3"
                  class="min-h-24 resize-y leading-relaxed"
                  placeholder="例如：機密文件&#10;僅供內部使用&#10;2026-07-15"
                  :disabled="settingsDisabled"
                  :aria-invalid="watermarkTextIssue ? 'true' : undefined"
                  aria-describedby="pdf-watermark-text-help pdf-watermark-text-count"
                />
                <span
                  id="pdf-watermark-text-help"
                  class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground"
                >
                  <span>
                    最多 {{ PDF_WATERMARK_TEXT_MAX_LINES }} 行、共
                    {{ PDF_WATERMARK_TEXT_MAX_CHARACTERS }} 個字元；每行置中對齊。
                  </span>
                  <output
                    id="pdf-watermark-text-count"
                    for="pdf-watermark-text"
                    class="tabular-nums"
                    :class="watermarkTextIssue ? 'text-destructive' : ''"
                  >
                    {{ watermarkTextCharacterCount }} / {{ PDF_WATERMARK_TEXT_MAX_CHARACTERS }} 字 ·
                    {{ watermarkTextLineCount }} / {{ PDF_WATERMARK_TEXT_MAX_LINES }} 行
                  </output>
                </span>
              </label>

              <div class="grid gap-2">
                <span class="text-sm font-medium">文字顏色</span>
                <div class="flex items-center gap-3">
                  <Input
                    id="pdf-watermark-color"
                    v-model="watermarkColor"
                    type="color"
                    class="h-10 w-14 shrink-0 cursor-pointer p-1"
                    :disabled="settingsDisabled"
                    aria-label="選擇浮水印文字顏色"
                  />
                  <output for="pdf-watermark-color" class="font-mono text-sm uppercase text-muted-foreground">
                    {{ watermarkColor }}
                  </output>
                </div>
              </div>
            </div>

            <div v-else class="grid gap-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium">浮水印圖片</span>
                <span class="text-xs text-muted-foreground">PNG 或 JPEG，最多 10 MB</span>
              </div>
              <input
                ref="watermarkImageInput"
                class="sr-only"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                :disabled="settingsDisabled"
                aria-label="選擇 PNG 或 JPEG 浮水印圖片"
                @change="handleWatermarkImageChange"
              />

              <div
                v-if="watermarkImageFile && watermarkImageUrl"
                class="flex min-w-0 items-center gap-3 rounded-lg border bg-muted/40 p-3"
              >
                <span class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1">
                  <img :src="watermarkImageUrl" alt="所選浮水印圖片" class="max-h-full max-w-full object-contain" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium" :title="watermarkImageFile.name">
                    {{ watermarkImageFile.name }}
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ formatPdfFileSize(watermarkImageFile.size) }}
                    <template v-if="watermarkImageDimensions">
                      · {{ watermarkImageDimensions.width.toLocaleString('zh-TW') }} ×
                      {{ watermarkImageDimensions.height.toLocaleString('zh-TW') }} px
                    </template>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  :disabled="settingsDisabled"
                  aria-label="移除浮水印圖片"
                  title="移除圖片"
                  @click="removeWatermarkImage"
                >
                  <XIcon />
                </Button>
              </div>

              <Button
                v-else
                type="button"
                variant="outline"
                class="h-auto min-h-20 w-full border-dashed py-4"
                :disabled="settingsDisabled"
                @click="openWatermarkImagePicker"
              >
                <ImageIcon />
                選擇 PNG 或 JPEG 圖片
              </Button>

              <p v-if="watermarkImageMessage" class="text-xs text-destructive" role="alert">
                {{ watermarkImageMessage }}
              </p>
            </div>

            <SegmentedControl
              v-model="layout"
              label="排列方式"
              :options="layoutOptions"
              :disabled="settingsDisabled"
            />

            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <RangeControl
                v-model="opacityPercent"
                label="透明度"
                :min="5"
                :max="100"
                suffix="%"
                :disabled="settingsDisabled"
              />
              <RangeControl
                v-model="sizePercent"
                label="尺寸"
                :min="5"
                :max="100"
                suffix="%"
                :disabled="settingsDisabled"
              />
              <RangeControl
                v-model="rotation"
                label="旋轉角度"
                :min="-180"
                :max="180"
                suffix="°"
                :disabled="settingsDisabled"
              />
              <RangeControl
                v-if="layout === 'tile'"
                v-model="horizontalSpacingPercent"
                label="水平間距"
                :min="0"
                :max="100"
                suffix="%"
                :disabled="settingsDisabled"
              />
              <RangeControl
                v-if="layout === 'tile'"
                v-model="verticalSpacingPercent"
                label="垂直間距"
                :min="0"
                :max="100"
                suffix="%"
                :disabled="settingsDisabled"
              />
            </div>

            <SegmentedControl
              v-model="pageSelectionMode"
              label="套用頁面"
              :options="pageSelectionOptions"
              :disabled="settingsDisabled"
            />

            <div v-if="pageSelectionMode === 'range'" class="grid gap-2">
              <label for="pdf-watermark-page-range" class="text-sm font-medium">頁碼範圍</label>
              <Input
                id="pdf-watermark-page-range"
                v-model="pageRange"
                placeholder="例如 1-3, 5"
                :disabled="settingsDisabled"
                :aria-invalid="Boolean(pageSelectionIssue)"
                aria-describedby="pdf-watermark-page-range-help"
              />
              <p
                id="pdf-watermark-page-range-help"
                class="text-xs"
                :class="pageSelectionIssue ? 'text-destructive' : 'text-muted-foreground'"
                :role="pageSelectionIssue ? 'alert' : undefined"
              >
                {{ pageSelectionIssue || '可使用逗號與連續範圍，例如 1-3, 5。' }}
              </p>
            </div>

            <div class="grid gap-1 rounded-lg bg-muted/50 p-3">
              <span class="text-xs text-muted-foreground">預計處理</span>
              <span v-if="pageSelectionIssue" class="text-sm font-medium text-destructive">
                {{ pageSelectionIssue }}
              </span>
              <span v-else class="text-sm font-medium">
                {{ selectedPageCount.toLocaleString('zh-TW') }} 頁，輸出 1 份 PDF
              </span>
            </div>

            <Alert v-if="settingsIssue" variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>設定無法使用</AlertTitle>
              <AlertDescription>{{ settingsIssue }}</AlertDescription>
            </Alert>
          </fieldset>
        </CardContent>

        <CardFooter class="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
          <p class="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheckIcon class="mt-0.5 size-4 shrink-0 text-emerald-600" />
            原始檔不會被覆寫，完成後會下載新的 PDF。
          </p>
          <Button
            v-if="generationState === 'running'"
            type="button"
            variant="outline"
            class="w-full sm:w-auto lg:w-full"
            @click="cancelGeneration"
          >
            <XIcon />
            取消產生
          </Button>
          <Button
            v-else
            type="button"
            class="w-full sm:w-auto lg:w-full"
            :disabled="!canGenerate"
            @click="generate"
          >
            <FileOutputIcon />
            產生 PDF（{{ selectedPageCount }} 頁）
          </Button>
        </CardFooter>
      </Card>

      <WatermarkPreview
        :horizontal-spacing-percent="horizontalSpacingPercent"
        :is-preview-page-selected="isPreviewPageSelected"
        :layout="layout"
        :opacity-percent="opacityPercent"
        :page-count="pageCount"
        :preview-aspect-ratio="previewAspectRatio"
        :preview-base-url="previewBaseUrl"
        :preview-message="previewMessage"
        :preview-page-number="previewPageNumber"
        :preview-state="previewState"
        :rotation="rotation"
        :size-percent="sizePercent"
        :vertical-spacing-percent="verticalSpacingPercent"
        :watermark-color="watermarkColor"
        :watermark-image-url="watermarkImageUrl"
        :watermark-kind="watermarkKind"
        :watermark-text="watermarkText"
        @page-change="setPreviewPage"
      />
    </div>

    <Card v-if="generationState !== 'idle' || result">
      <CardHeader class="border-b px-4 pb-4 sm:px-5">
        <div>
          <CardTitle>
            <h2 ref="resultHeading" tabindex="-1" class="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              輸出 PDF
            </h2>
          </CardTitle>
          <CardDescription>完成後可直接下載新的 PDF 檔案。</CardDescription>
        </div>
        <CardAction>
          <Badge
            :variant="generationState === 'failed' ? 'destructive' : generationState === 'completed' ? 'secondary' : 'outline'"
          >
            <LoaderCircleIcon
              v-if="generationState === 'running'"
              class="animate-spin motion-reduce:animate-none"
            />
            <FileOutputIcon v-else />
            {{ generationState === 'running' ? '處理中' : generationState === 'completed' ? '已完成' : generationState === 'cancelled' ? '已取消' : '處理失敗' }}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent class="grid gap-4 px-4 sm:px-5">
        <div v-if="generationState === 'running'" class="grid gap-2">
          <div class="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>{{ generationStageLabel }}</span>
            <span class="tabular-nums">{{ progressCompleted }} / {{ progressTotal }} 頁 · {{ progressPercent }}%</span>
          </div>
          <div
            class="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuetext="`${generationStageLabel} ${progressCompleted} / ${progressTotal} 頁`"
          >
            <div
              class="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>

        <p
          v-if="generationMessage && generationState !== 'failed'"
          class="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {{ generationMessage }}
        </p>

        <Alert v-if="generationState === 'failed'" variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>無法產生 PDF</AlertTitle>
          <AlertDescription>{{ generationMessage || '處理 PDF 時發生錯誤，請稍後再試。' }}</AlertDescription>
        </Alert>

        <template v-if="result">
          <Alert v-if="resultIsStale">
            <TriangleAlertIcon />
            <AlertTitle>設定已經變更</AlertTitle>
            <AlertDescription>
              目前的下載檔是使用上一組設定產生；若要套用最新設定，請重新產生 PDF。
            </AlertDescription>
          </Alert>

          <div class="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FileOutputIcon class="size-5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium" :title="result.filename">{{ result.filename }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                PDF · {{ formatPdfFileSize(result.blob.size) }} · 原始檔未被覆寫
              </p>
            </div>
            <Button as-child class="w-full sm:w-auto">
              <a :href="result.url" :download="result.filename">
                <DownloadIcon />
                下載 PDF
              </a>
            </Button>
          </div>
        </template>
      </CardContent>
    </Card>
  </section>
</template>
