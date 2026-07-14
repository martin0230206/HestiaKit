<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FileTextIcon,
  LoaderCircleIcon,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type PreviewState = 'idle' | 'rendering' | 'ready' | 'failed'
type WatermarkKind = 'text' | 'image'
type WatermarkLayout = 'center' | 'tile'

const props = defineProps<{
  isPreviewPageSelected: boolean
  horizontalSpacingPercent: number
  layout: WatermarkLayout
  opacityPercent: number
  pageCount: number
  previewAspectRatio: number | null
  previewBaseUrl: string
  previewMessage: string
  previewPageNumber: number
  previewState: PreviewState
  rotation: number
  sizePercent: number
  verticalSpacingPercent: number
  watermarkColor: string
  watermarkImageUrl: string
  watermarkKind: WatermarkKind
  watermarkText: string
}>()

const emit = defineEmits<{
  pageChange: [pageNumber: number]
}>()

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

const normalizedOpacity = computed(() => clamp(props.opacityPercent, 0, 100) / 100)
const normalizedSize = computed(() => clamp(props.sizePercent, 5, 100))
// PDF 使用向上的 Y 軸；CSS 使用向下的 Y 軸，因此畫面預覽要反轉角度符號。
const previewRotation = computed(() => -props.rotation)
const previewAspectRatio = computed(() => props.previewAspectRatio ?? 1 / Math.sqrt(2))
const previewPageStyle = computed<CSSProperties>(() => ({
  aspectRatio: String(previewAspectRatio.value),
}))
const watermarkTextContent = computed(() => props.watermarkText.trim())
const hasWatermarkContent = computed(() =>
  props.watermarkKind === 'text'
    ? watermarkTextContent.value.length > 0
    : props.watermarkImageUrl.length > 0,
)
const showPageSelectionNotice = computed(
  () => props.previewBaseUrl.length > 0 && !props.isPreviewPageSelected,
)
const shouldShowWatermark = computed(
  () =>
    props.previewBaseUrl.length > 0 &&
    props.isPreviewPageSelected &&
    hasWatermarkContent.value,
)
const textCharacterCount = computed(() => Math.max(1, [...watermarkTextContent.value].length))
const centeredTextFontSize = computed(() =>
  clamp(normalizedSize.value / textCharacterCount.value, 1.2, 18),
)
const centeredTextStyle = computed<CSSProperties>(() => ({
  color: props.watermarkColor,
  fontSize: `${centeredTextFontSize.value}cqw`,
  opacity: normalizedOpacity.value,
  transform: `translate(-50%, -50%) rotate(${previewRotation.value}deg)`,
}))
const centeredImageStyle = computed<CSSProperties>(() => ({
  opacity: normalizedOpacity.value,
  transform: `translate(-50%, -50%) rotate(${previewRotation.value}deg)`,
  width: `${normalizedSize.value}%`,
}))

const tileColumnCount = computed(() =>
  clamp(Math.round(150 / Math.max(15, normalizedSize.value)), 2, 6),
)
const tileRowCount = computed(() =>
  clamp(Math.ceil(tileColumnCount.value / previewAspectRatio.value) + 1, 2, 9),
)
const tileItems = computed(() =>
  Array.from({ length: tileColumnCount.value * tileRowCount.value }, (_, index) => index),
)
const tileGridStyle = computed<CSSProperties>(() => ({
  columnGap: `${0.5 + clamp(props.horizontalSpacingPercent, 0, 100) / 25}%`,
  gridTemplateColumns: `repeat(${tileColumnCount.value}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${tileRowCount.value}, minmax(0, 1fr))`,
  rowGap: `${0.5 + clamp(props.verticalSpacingPercent, 0, 100) / 25}%`,
}))
const tiledTextStyle = computed<CSSProperties>(() => ({
  color: props.watermarkColor,
  fontSize: `${clamp(centeredTextFontSize.value / Math.max(1, tileColumnCount.value - 1), 0.8, 7)}cqw`,
  opacity: normalizedOpacity.value,
  transform: `rotate(${previewRotation.value}deg)`,
}))
const tiledImageStyle = computed<CSSProperties>(() => ({
  opacity: normalizedOpacity.value,
  transform: `rotate(${previewRotation.value}deg)`,
  width: `${clamp(normalizedSize.value * tileColumnCount.value * 0.6, 35, 100)}%`,
}))

const previewSummary = computed(() => {
  const watermark =
    props.watermarkKind === 'text'
      ? `文字浮水印「${watermarkTextContent.value || '尚未輸入'}」`
      : props.watermarkImageUrl
        ? '圖片浮水印'
        : '尚未選擇浮水印圖片'
  const arrangement = props.layout === 'center' ? '置中' : '平鋪'
  const pageApplication = showPageSelectionNotice.value ? '此頁不套用浮水印；' : ''

  return `PDF 第 ${props.previewPageNumber} 頁，共 ${props.pageCount} 頁；${pageApplication}${watermark}，${arrangement}，透明度 ${props.opacityPercent}%，旋轉 ${props.rotation} 度。`
})

const canGoToPreviousPage = computed(
  () => props.previewPageNumber > 1 && props.previewState !== 'rendering',
)
const canGoToNextPage = computed(
  () => props.previewPageNumber < props.pageCount && props.previewState !== 'rendering',
)

function goToPreviousPage() {
  if (canGoToPreviousPage.value) {
    emit('pageChange', props.previewPageNumber - 1)
  }
}

function goToNextPage() {
  if (canGoToNextPage.value) {
    emit('pageChange', props.previewPageNumber + 1)
  }
}
</script>

<template>
  <Card class="h-full lg:sticky lg:top-8">
    <CardHeader class="border-b px-4 pb-4 sm:px-5">
      <div class="flex items-center gap-3">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <EyeIcon class="size-4" />
        </span>
        <div class="min-w-0">
          <CardTitle>單頁預覽</CardTitle>
          <CardDescription>預覽僅供確認位置與外觀，實際輸出可能略有差異。</CardDescription>
        </div>
      </div>
    </CardHeader>

    <CardContent class="grid gap-4 px-4 sm:px-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            第 {{ pageCount > 0 ? previewPageNumber : 0 }} / {{ pageCount }} 頁
          </Badge>
          <Badge v-if="showPageSelectionNotice" variant="secondary">
            此頁不套用浮水印
          </Badge>
        </div>
        <div class="flex items-center gap-2" aria-label="切換 PDF 預覽頁面">
          <Button
            type="button"
            variant="outline"
            size="icon"
            :disabled="!canGoToPreviousPage"
            aria-label="預覽上一頁"
            title="上一頁"
            @click="goToPreviousPage"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            :disabled="!canGoToNextPage"
            aria-label="預覽下一頁"
            title="下一頁"
            @click="goToNextPage"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <figure class="grid gap-3" aria-labelledby="pdf-watermark-preview-caption">
        <div class="max-h-[70svh] overflow-auto rounded-xl border bg-muted/40 p-3 sm:p-4">
          <div
            class="pdf-watermark-preview__page relative mx-auto w-full max-w-3xl overflow-hidden rounded-sm bg-white shadow-md"
            :style="previewPageStyle"
            :aria-busy="previewState === 'rendering'"
          >
            <img
              v-if="previewBaseUrl"
              :src="previewBaseUrl"
              alt=""
              class="absolute inset-0 size-full object-fill"
            />

            <div
              v-if="previewState === 'rendering'"
              class="absolute inset-0 z-20 grid place-items-center bg-background/75 text-center backdrop-blur-sm"
              role="status"
            >
              <span class="grid justify-items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon class="size-5 animate-spin motion-reduce:animate-none" />
                正在建立頁面預覽…
              </span>
            </div>

            <div
              v-else-if="previewState === 'failed'"
              class="absolute inset-0 grid place-items-center p-6 text-center text-sm text-destructive"
              role="alert"
            >
              {{ previewMessage || '無法顯示這一頁的預覽。' }}
            </div>

            <div
              v-else-if="!previewBaseUrl"
              class="absolute inset-0 grid place-items-center p-6 text-center"
            >
              <span class="grid max-w-xs justify-items-center gap-3 text-sm text-muted-foreground">
                <FileTextIcon class="size-8" />
                選擇 PDF 後會在這裡顯示單頁預覽。
              </span>
            </div>

            <div
              v-if="shouldShowWatermark && layout === 'center'"
              class="pointer-events-none absolute inset-0 z-10 overflow-hidden"
              aria-hidden="true"
            >
              <span
                v-if="watermarkKind === 'text'"
                class="absolute left-1/2 top-1/2 max-w-none whitespace-nowrap font-bold leading-none"
                :style="centeredTextStyle"
              >
                {{ watermarkTextContent }}
              </span>
              <img
                v-else
                :src="watermarkImageUrl"
                alt=""
                class="absolute left-1/2 top-1/2 h-auto max-w-none"
                :style="centeredImageStyle"
              />
            </div>

            <div
              v-else-if="shouldShowWatermark"
              class="pointer-events-none absolute inset-0 z-10 grid overflow-hidden p-[2%]"
              :style="tileGridStyle"
              aria-hidden="true"
            >
              <span
                v-for="item in tileItems"
                :key="item"
                class="grid min-h-0 min-w-0 place-items-center overflow-visible"
              >
                <span
                  v-if="watermarkKind === 'text'"
                  class="max-w-none whitespace-nowrap font-bold leading-none"
                  :style="tiledTextStyle"
                >
                  {{ watermarkTextContent }}
                </span>
                <img
                  v-else
                  :src="watermarkImageUrl"
                  alt=""
                  class="h-auto max-w-full"
                  :style="tiledImageStyle"
                />
              </span>
            </div>
          </div>
        </div>

        <figcaption id="pdf-watermark-preview-caption" class="text-xs leading-5 text-muted-foreground">
          {{ previewSummary }} 預覽是近似值；下載後請再確認輸出的 PDF。
        </figcaption>
      </figure>
    </CardContent>
  </Card>
</template>

<style scoped>
.pdf-watermark-preview__page {
  container-type: inline-size;
}
</style>
