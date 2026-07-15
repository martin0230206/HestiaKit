import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  createPdfWatermarkFilename,
  hasPdfDigitalSignatureMarker,
  inspectPdfWatermarkImage,
  parsePdfWatermarkPageRange,
} from '@/utils/pdfWatermark'
import type { PdfWatermarkWorkerResponse } from '@/workers/pdfWatermark.worker'

type PdfJsModule = typeof import('pdfjs-dist')
type DocumentState = 'idle' | 'loading' | 'ready' | 'unsupported-protected' | 'failed'
type GenerationState = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed'
type GenerationStage = 'preparing' | 'applying' | 'saving' | null
type PageSelectionMode = 'all' | 'range'
type WatermarkKind = 'text' | 'image'
type WatermarkLayout = 'center' | 'tile'
type PreviewState = 'idle' | 'rendering' | 'ready' | 'failed'
type DigitalSignatureState =
  | 'idle'
  | 'checking'
  | 'none'
  | 'possible'
  | 'present'
  | 'unknown'

export interface PdfWatermarkResult {
  blob: Blob
  filename: string
  url: string
}

const MAX_PDF_FILE_BYTES = 50 * 1024 * 1024
const MAX_SELECTED_PAGES = 500
const MAX_WATERMARK_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_WATERMARK_IMAGE_PIXELS = 16_777_216
const MAX_PREVIEW_WIDTH = 1_200
const MAX_PREVIEW_HEIGHT = 1_600
const MAX_PREVIEW_PIXELS = 2_000_000
const DEFAULT_WATERMARK_TEXT = '機密文件'

let pdfJsModulePromise: Promise<PdfJsModule> | undefined

async function loadPdfJs(): Promise<PdfJsModule> {
  pdfJsModulePromise ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    return pdfjs
  })

  return pdfJsModulePromise
}

function getPdfAssetUrl(directory: 'cmaps' | 'iccs' | 'standard_fonts' | 'wasm'): string {
  return new URL(`${import.meta.env.BASE_URL}pdfjs/${directory}/`, window.location.href).href
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('無法建立文字浮水印圖片。'))
      }
    }, 'image/png')
  })
}

async function createTextWatermarkBlob(text: string, color: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('瀏覽器無法建立文字浮水印。')
  }

  const fontSize = 160
  const horizontalPadding = 80
  const verticalPadding = 48
  context.font = `700 ${fontSize}px system-ui, sans-serif`
  const metrics = context.measureText(text)
  canvas.width = Math.min(4_096, Math.max(1, Math.ceil(metrics.width + horizontalPadding * 2)))
  canvas.height = Math.ceil(fontSize + verticalPadding * 2)

  context.font = `700 ${fontSize}px system-ui, sans-serif`
  context.fillStyle = color
  context.textBaseline = 'middle'
  context.fillText(
    text,
    horizontalPadding,
    canvas.height / 2,
    canvas.width - horizontalPadding * 2,
  )

  try {
    return await canvasToPngBlob(canvas)
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export function usePdfWatermark() {
  const selectedFile = shallowRef<File | null>(null)
  const documentState = ref<DocumentState>('idle')
  const documentMessage = ref('')
  const pageCount = ref(0)
  const previewPageNumber = ref(1)
  const previewState = ref<PreviewState>('idle')
  const previewMessage = ref('')
  const previewBaseUrl = ref('')
  const previewAspectRatio = ref<number | null>(null)
  const digitalSignatureState = ref<DigitalSignatureState>('idle')
  const hasDigitalSignatures = computed(
    () => digitalSignatureState.value === 'present',
  )
  const generationState = ref<GenerationState>('idle')
  const generationStage = ref<GenerationStage>(null)
  const generationMessage = ref('')
  const progressCompleted = ref(0)
  const progressTotal = ref(0)
  const watermarkText = ref(DEFAULT_WATERMARK_TEXT)
  const watermarkColor = ref('#b42318')
  const watermarkKind = ref<WatermarkKind>('text')
  const watermarkImageFile = shallowRef<File | null>(null)
  const watermarkImageFormat = ref<'png' | 'jpeg' | null>(null)
  const watermarkImageUrl = ref('')
  const watermarkImageMessage = ref('')
  const watermarkImageDimensions = ref<{ height: number; width: number } | null>(null)
  const watermarkImageVersion = ref(0)
  const layout = ref<WatermarkLayout>('center')
  const opacityPercent = ref(25)
  const rotation = ref(-45)
  const sizePercent = ref(45)
  const horizontalSpacingPercent = ref(20)
  const verticalSpacingPercent = ref(20)
  const pageSelectionMode = ref<PageSelectionMode>('all')
  const pageRange = ref('')
  const result = shallowRef<PdfWatermarkResult | null>(null)
  const resultFingerprint = ref('')
  const pageSelectionResult = computed(() => {
    if (pageCount.value < 1) {
      return { issue: '', pages: [] as number[] }
    }

    if (pageSelectionMode.value === 'all') {
      if (pageCount.value > MAX_SELECTED_PAGES) {
        return {
          issue: `單次最多處理 ${MAX_SELECTED_PAGES} 頁，請改用自訂頁碼。`,
          pages: [] as number[],
        }
      }

      return {
        issue: '',
        pages: Array.from({ length: pageCount.value }, (_, index) => index + 1),
      }
    }

    const parsed = parsePdfWatermarkPageRange(
      pageRange.value,
      pageCount.value,
      MAX_SELECTED_PAGES,
    )
    return parsed.ok
      ? { issue: '', pages: parsed.pages }
      : { issue: parsed.issue, pages: [] as number[] }
  })
  const pageSelectionIssue = computed(() => pageSelectionResult.value.issue)
  const selectedPages = computed(() => pageSelectionResult.value.pages)
  const selectedPageCount = computed(() => selectedPages.value.length)
  const settingsIssue = computed(() => {
    if (watermarkKind.value === 'text' && watermarkText.value.length > 80) {
      return '文字浮水印最多 80 個字元。'
    }
    if (watermarkKind.value === 'text' && !/^#[0-9a-f]{6}$/i.test(watermarkColor.value)) {
      return '文字顏色格式無效。'
    }
    if (
      !Number.isFinite(opacityPercent.value) ||
      opacityPercent.value < 5 ||
      opacityPercent.value > 100
    ) {
      return '透明度必須介於 5% 與 100% 之間。'
    }
    if (
      !Number.isFinite(sizePercent.value) ||
      sizePercent.value < 5 ||
      sizePercent.value > 100
    ) {
      return '尺寸必須介於 5% 與 100% 之間。'
    }
    if (
      !Number.isFinite(rotation.value) ||
      rotation.value < -180 ||
      rotation.value > 180
    ) {
      return '角度必須介於 -180° 與 180° 之間。'
    }
    if (
      !Number.isFinite(horizontalSpacingPercent.value) ||
      horizontalSpacingPercent.value < 0 ||
      horizontalSpacingPercent.value > 100
    ) {
      return '水平間距必須介於 0% 與 100% 之間。'
    }
    if (
      !Number.isFinite(verticalSpacingPercent.value) ||
      verticalSpacingPercent.value < 0 ||
      verticalSpacingPercent.value > 100
    ) {
      return '垂直間距必須介於 0% 與 100% 之間。'
    }
    return ''
  })
  const currentFingerprint = computed(() =>
    JSON.stringify({
      color: watermarkColor.value,
      imageVersion: watermarkImageVersion.value,
      kind: watermarkKind.value,
      layout: layout.value,
      opacity: opacityPercent.value,
      pages: selectedPages.value,
      rotation: rotation.value,
      size: sizePercent.value,
      horizontalSpacing: horizontalSpacingPercent.value,
      text: watermarkText.value,
      verticalSpacing: verticalSpacingPercent.value,
    }),
  )
  const resultIsStale = computed(
    () => result.value !== null && resultFingerprint.value !== currentFingerprint.value,
  )
  const progressPercent = computed(() =>
    progressTotal.value > 0
      ? Math.round((progressCompleted.value / progressTotal.value) * 100)
      : 0,
  )
  const canGenerate = computed(
    () =>
      documentState.value === 'ready' &&
      (watermarkKind.value === 'text'
        ? watermarkText.value.trim().length > 0
        : watermarkImageFile.value !== null && watermarkImageFormat.value !== null) &&
      selectedPages.value.length > 0 &&
      settingsIssue.value === '' &&
      digitalSignatureState.value !== 'checking' &&
      generationState.value !== 'running',
  )

  let loadingTask: PDFDocumentLoadingTask | null = null
  let pdfDocument: PDFDocumentProxy | null = null
  let worker: Worker | null = null
  let previewRenderTask: RenderTask | null = null
  let loadSequence = 0
  let previewSequence = 0
  let watermarkImageSequence = 0
  let jobSequence = 0
  let activeJobId: string | null = null
  let resolveGeneration: (() => void) | null = null

  async function destroyPdfDocument() {
    previewSequence += 1
    previewRenderTask?.cancel()
    previewRenderTask = null
    const task = loadingTask
    const documentProxy = pdfDocument
    loadingTask = null
    pdfDocument = null

    if (task) {
      await task.destroy().catch(() => undefined)
    } else if (documentProxy) {
      await documentProxy.cleanup().catch(() => undefined)
    }
  }

  function clearPreview() {
    previewSequence += 1
    previewRenderTask?.cancel()
    previewRenderTask = null
    if (previewBaseUrl.value) {
      URL.revokeObjectURL(previewBaseUrl.value)
    }
    previewBaseUrl.value = ''
    previewAspectRatio.value = null
    previewMessage.value = ''
    previewState.value = 'idle'
    previewPageNumber.value = 1
  }

  async function renderPreview(pageNumber: number) {
    const documentProxy = pdfDocument
    if (!documentProxy) return

    const sequence = ++previewSequence
    previewRenderTask?.cancel()
    previewRenderTask = null
    if (previewBaseUrl.value) {
      URL.revokeObjectURL(previewBaseUrl.value)
      previewBaseUrl.value = ''
    }
    previewState.value = 'rendering'
    previewMessage.value = ''

    let page: PDFPageProxy | null = null
    const canvas = document.createElement('canvas')

    try {
      page = await documentProxy.getPage(pageNumber)
      if (sequence !== previewSequence) return

      const baseViewport = page.getViewport({ scale: 1 })
      if (
        !Number.isFinite(baseViewport.width) ||
        !Number.isFinite(baseViewport.height) ||
        baseViewport.width <= 0 ||
        baseViewport.height <= 0
      ) {
        throw new Error('Invalid PDF page dimensions')
      }
      const pixelBudget =
        MAX_PREVIEW_PIXELS - MAX_PREVIEW_WIDTH - MAX_PREVIEW_HEIGHT - 1
      const scale = Math.min(
        2,
        (MAX_PREVIEW_WIDTH - 1) / baseViewport.width,
        (MAX_PREVIEW_HEIGHT - 1) / baseViewport.height,
        Math.sqrt(pixelBudget / (baseViewport.width * baseViewport.height)),
      )
      const viewport = page.getViewport({ scale })
      canvas.width = Math.max(1, Math.ceil(viewport.width))
      canvas.height = Math.max(1, Math.ceil(viewport.height))
      const task = page.render({ canvas, viewport, background: '#ffffff' })
      previewRenderTask = task
      await task.promise
      if (sequence !== previewSequence) return

      const blob = await canvasToPngBlob(canvas)
      if (sequence !== previewSequence) return

      previewBaseUrl.value = URL.createObjectURL(blob)
      previewAspectRatio.value = baseViewport.width / baseViewport.height
      previewPageNumber.value = pageNumber
      previewState.value = 'ready'
    } catch (error) {
      if (sequence !== previewSequence) return
      if (error instanceof Error && error.name === 'RenderingCancelledException') return
      previewState.value = 'failed'
      previewMessage.value = '無法產生這一頁的預覽，但仍可嘗試輸出 PDF。'
    } finally {
      if (sequence === previewSequence) {
        previewRenderTask = null
      }
      page?.cleanup()
      canvas.width = 0
      canvas.height = 0
    }
  }

  async function setPreviewPage(pageNumber: number) {
    if (
      documentState.value !== 'ready' ||
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pageCount.value
    ) {
      return
    }
    await renderPreview(pageNumber)
  }

  async function detectDigitalSignatures(
    documentProxy: PDFDocumentProxy,
  ): Promise<'none' | 'present' | 'unknown'> {
    try {
      const fields = await documentProxy.getFieldObjects()
      return Object.values(fields ?? {}).some((entries) =>
        entries.some((entry) => Reflect.get(entry, 'fieldType') === 'Sig'),
      )
        ? 'present'
        : 'none'
    } catch {
      return 'unknown'
    }
  }

  function clearResult() {
    if (result.value) {
      URL.revokeObjectURL(result.value.url)
      result.value = null
    }
    resultFingerprint.value = ''
  }

  function clearWatermarkImage() {
    watermarkImageSequence += 1
    const hadImage = watermarkImageFile.value !== null || watermarkImageUrl.value.length > 0
    if (watermarkImageUrl.value) {
      URL.revokeObjectURL(watermarkImageUrl.value)
    }
    watermarkImageFile.value = null
    watermarkImageFormat.value = null
    watermarkImageUrl.value = ''
    watermarkImageMessage.value = ''
    watermarkImageDimensions.value = null
    if (hadImage) {
      watermarkImageVersion.value += 1
    }
  }

  async function selectWatermarkImage(file: File) {
    clearWatermarkImage()
    const sequence = watermarkImageSequence

    if (file.size > MAX_WATERMARK_IMAGE_BYTES) {
      watermarkImageMessage.value = '浮水印圖片不可超過 10 MB。'
      return
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (sequence !== watermarkImageSequence) return

      const inspection = inspectPdfWatermarkImage(bytes)
      if (!inspection.ok) {
        watermarkImageMessage.value = inspection.issue
        return
      }
      if (
        inspection.width > 8_192 ||
        inspection.height > 8_192 ||
        inspection.width * inspection.height > MAX_WATERMARK_IMAGE_PIXELS
      ) {
        watermarkImageMessage.value = '浮水印圖片像素過大，最多約 1,677 萬像素。'
        return
      }

      const bitmap = await createImageBitmap(file)
      let dimensions: { height: number; width: number }
      try {
        dimensions = { height: bitmap.height, width: bitmap.width }
      } finally {
        bitmap.close()
      }
      if (sequence !== watermarkImageSequence) return

      if (
        dimensions.width < 1 ||
        dimensions.height < 1 ||
        dimensions.width > 8_192 ||
        dimensions.height > 8_192 ||
        dimensions.width * dimensions.height > MAX_WATERMARK_IMAGE_PIXELS
      ) {
        watermarkImageMessage.value = '浮水印圖片像素過大，最多約 1,677 萬像素。'
        return
      }

      const objectUrl = URL.createObjectURL(file)
      if (sequence !== watermarkImageSequence) {
        URL.revokeObjectURL(objectUrl)
        return
      }
      watermarkImageFile.value = file
      watermarkImageFormat.value = inspection.format
      watermarkImageVersion.value += 1
      watermarkImageDimensions.value = dimensions
      watermarkImageUrl.value = objectUrl
    } catch {
      if (sequence === watermarkImageSequence) {
        watermarkImageMessage.value = '無法讀取浮水印圖片，請確認檔案內容。'
      }
    }
  }

  function stopActiveGeneration() {
    jobSequence += 1
    activeJobId = null
    worker?.terminate()
    worker = null
    const resolve = resolveGeneration
    resolveGeneration = null
    resolve?.()
  }

  function resetGenerationState() {
    generationState.value = 'idle'
    generationStage.value = null
    generationMessage.value = ''
    progressCompleted.value = 0
    progressTotal.value = 0
  }

  async function clearFile() {
    loadSequence += 1
    stopActiveGeneration()
    clearResult()
    clearWatermarkImage()
    clearPreview()
    selectedFile.value = null
    documentState.value = 'idle'
    documentMessage.value = ''
    pageCount.value = 0
    pageRange.value = ''
    pageSelectionMode.value = 'all'
    digitalSignatureState.value = 'idle'
    resetGenerationState()
    await destroyPdfDocument()
  }

  async function selectFile(file: File) {
    const sequence = ++loadSequence
    stopActiveGeneration()
    resetGenerationState()
    clearResult()
    clearWatermarkImage()
    clearPreview()
    selectedFile.value = null
    documentState.value = 'loading'
    documentMessage.value = ''
    pageCount.value = 0
    pageRange.value = ''
    pageSelectionMode.value = 'all'
    digitalSignatureState.value = 'idle'
    await destroyPdfDocument()
    if (sequence !== loadSequence) return

    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf')
    if (!hasPdfExtension && file.type !== 'application/pdf') {
      selectedFile.value = null
      documentState.value = 'failed'
      documentMessage.value = '請選擇 PDF 檔案。'
      return
    }

    if (file.size > MAX_PDF_FILE_BYTES) {
      selectedFile.value = null
      documentState.value = 'failed'
      documentMessage.value = 'PDF 檔案不可超過 50 MB。'
      return
    }

    selectedFile.value = file

    let pdfjs: PdfJsModule | undefined
    try {
      pdfjs = await loadPdfJs()
      if (sequence !== loadSequence) return
      const data = new Uint8Array(await file.arrayBuffer())
      if (sequence !== loadSequence) return
      const hasSignatureMarker = hasPdfDigitalSignatureMarker(data)

      const task = pdfjs.getDocument({
        cMapPacked: true,
        cMapUrl: getPdfAssetUrl('cmaps'),
        data,
        iccUrl: getPdfAssetUrl('iccs'),
        standardFontDataUrl: getPdfAssetUrl('standard_fonts'),
        stopAtErrors: true,
        useWasm: true,
        wasmUrl: getPdfAssetUrl('wasm'),
      })
      loadingTask = task
      const loadedDocument = await task.promise
      if (sequence !== loadSequence) {
        await task.destroy()
        return
      }

      pdfDocument = loadedDocument
      pageCount.value = loadedDocument.numPages
      digitalSignatureState.value = 'checking'
      const signatureState = await detectDigitalSignatures(loadedDocument)
      if (sequence !== loadSequence || pdfDocument !== loadedDocument) return
      digitalSignatureState.value =
        signatureState === 'present'
          ? 'present'
          : hasSignatureMarker
            ? 'possible'
            : signatureState
      documentState.value = 'ready'
      await renderPreview(1)
    } catch (error) {
      if (sequence !== loadSequence) return
      if (pdfjs && error instanceof pdfjs.PasswordException) {
        documentState.value = 'unsupported-protected'
        documentMessage.value = '目前不支援加密或需要密碼的 PDF。'
      } else if (pdfjs && error instanceof pdfjs.InvalidPDFException) {
        documentState.value = 'failed'
        documentMessage.value = '檔案不是有效的 PDF，或內容已損壞。'
      } else {
        documentState.value = 'failed'
        documentMessage.value = '無法讀取這份 PDF，請確認檔案後再試一次。'
      }
    }
  }

  async function generate() {
    const file = selectedFile.value
    if (!file || !canGenerate.value) return

    const jobId = `pdf-watermark-${++jobSequence}`
    const generationFingerprint = currentFingerprint.value
    activeJobId = jobId
    generationState.value = 'running'
    generationStage.value = 'preparing'
    generationMessage.value = ''
    progressCompleted.value = 0
    progressTotal.value = selectedPages.value.length
    clearResult()

    let pdfBuffer: ArrayBuffer
    let watermarkBuffer: ArrayBuffer
    let watermarkFormat: 'png' | 'jpeg'
    try {
      const watermarkBlob =
        watermarkKind.value === 'text'
          ? await createTextWatermarkBlob(
              watermarkText.value.trim(),
              watermarkColor.value,
            )
          : watermarkImageFile.value
      if (!watermarkBlob) {
        throw new Error('Missing watermark image')
      }
      const selectedImageFormat = watermarkImageFormat.value
      if (watermarkKind.value === 'image' && !selectedImageFormat) {
        throw new Error('Missing image format')
      }
      watermarkFormat =
        watermarkKind.value === 'image'
          ? (selectedImageFormat as 'png' | 'jpeg')
          : 'png'
      ;[pdfBuffer, watermarkBuffer] = await Promise.all([
        file.arrayBuffer(),
        watermarkBlob.arrayBuffer(),
      ])
    } catch {
      if (jobId !== activeJobId) return
      activeJobId = null
      generationState.value = 'failed'
      generationStage.value = null
      generationMessage.value = '無法準備 PDF 或浮水印資料，請再試一次。'
      return
    }

    if (jobId !== activeJobId) return

    worker?.terminate()
    try {
      worker = new Worker(new URL('../workers/pdfWatermark.worker.ts', import.meta.url), {
        type: 'module',
      })
    } catch {
      if (jobId !== activeJobId) return
      worker = null
      activeJobId = null
      generationState.value = 'failed'
      generationStage.value = null
      generationMessage.value = '瀏覽器無法啟動 PDF 處理程序。'
      return
    }

    return await new Promise<void>((resolve) => {
      resolveGeneration = resolve
      if (!worker) {
        activeJobId = null
        resolveGeneration = null
        resolve()
        return
      }

      worker.onmessage = (event: MessageEvent<PdfWatermarkWorkerResponse>) => {
        const message = event.data
        if (message.jobId !== activeJobId) return

        if (message.type === 'progress') {
          generationStage.value =
            message.progress.completedPages === message.progress.totalPages
              ? 'saving'
              : 'applying'
          progressCompleted.value = message.progress.completedPages
          progressTotal.value = message.progress.totalPages
          generationMessage.value = `正在處理第 ${message.progress.completedPages} / ${message.progress.totalPages} 頁。`
        } else if (message.type === 'success') {
          try {
            const blob = new Blob([message.pdfBuffer], { type: 'application/pdf' })
            result.value = {
              blob,
              filename: createPdfWatermarkFilename(file.name),
              url: URL.createObjectURL(blob),
            }
            resultFingerprint.value = generationFingerprint
            generationState.value = 'completed'
            progressCompleted.value = progressTotal.value
            generationMessage.value = '已完成 PDF 浮水印。'
          } catch {
            generationState.value = 'failed'
            generationMessage.value = 'PDF 已產生，但瀏覽器無法建立下載檔案。'
          }
          generationStage.value = null
          worker?.terminate()
          worker = null
          activeJobId = null
          resolveGeneration = null
          resolve()
        } else if (message.type === 'error') {
          generationState.value = 'failed'
          generationStage.value = null
          generationMessage.value = message.error.message
          worker?.terminate()
          worker = null
          activeJobId = null
          resolveGeneration = null
          resolve()
        }
      }
      worker.onerror = () => {
        if (jobId !== activeJobId) return
        generationState.value = 'failed'
        generationStage.value = null
        generationMessage.value = 'PDF 處理程序發生錯誤，請稍後再試。'
        worker?.terminate()
        worker = null
        activeJobId = null
        resolveGeneration = null
        resolve()
      }

      try {
        worker.postMessage(
          {
            type: 'generate',
            jobId,
            input: {
              options: {
                layout: layout.value,
                opacity: opacityPercent.value / 100,
                rotation: rotation.value,
                horizontalSpacingRatio: horizontalSpacingPercent.value / 100,
                widthRatio: sizePercent.value / 100,
                verticalSpacingRatio: verticalSpacingPercent.value / 100,
              },
              pdfBuffer,
              selectedPages: [...selectedPages.value],
              watermarkBuffer,
              watermarkFormat,
            },
          },
          [pdfBuffer, watermarkBuffer],
        )
      } catch {
        if (jobId !== activeJobId) return
        generationState.value = 'failed'
        generationStage.value = null
        generationMessage.value = '無法把 PDF 資料交給處理程序。'
        worker?.terminate()
        worker = null
        activeJobId = null
        resolveGeneration = null
        resolve()
      }
    })
  }

  function cancelGeneration() {
    if (generationState.value !== 'running') return

    stopActiveGeneration()
    generationState.value = 'cancelled'
    generationStage.value = null
    generationMessage.value = '已取消產生 PDF。'
  }

  onScopeDispose(() => {
    loadSequence += 1
    jobSequence += 1
    activeJobId = null
    worker?.terminate()
    resolveGeneration?.()
    resolveGeneration = null
    clearResult()
    clearWatermarkImage()
    clearPreview()
    void destroyPdfDocument()
  })

  return {
    cancelGeneration,
    canGenerate,
    clearFile,
    clearWatermarkImage,
    documentMessage,
    documentState,
    generate,
    generationMessage,
    generationStage,
    generationState,
    digitalSignatureState,
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
  }
}
