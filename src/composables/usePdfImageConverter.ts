import { computed, onScopeDispose, ref } from 'vue'
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  MAX_PDF_IMAGE_PIXELS,
  calculatePdfOutputSize,
  createPdfArchiveFilename,
  createPdfImageFilename,
  getPdfBatchPixelIssue,
  getPdfImageEncodingOptions,
  getPdfPageLimitIssue,
  parsePdfPageRange,
  type PdfImageFormat,
  type PdfPageRangeResult,
} from '@/utils/pdfImageConverter'

type PdfJsModule = typeof import('pdfjs-dist')
type DocumentState = 'idle' | 'loading' | 'ready' | 'password-required' | 'failed'
type ConversionState = 'idle' | 'converting' | 'completed' | 'cancelled' | 'failed'
type ArchiveState = 'idle' | 'preparing' | 'failed'
type PageSelectionMode = 'all' | 'range'
type DpiOption = '96' | '150' | '300'

export interface PdfImageResult {
  pageNumber: number
  filename: string
  blob: Blob
  url: string
  width: number
  height: number
}

const MAX_PDF_FILE_BYTES = 100 * 1024 * 1024

let pdfJsModulePromise: Promise<PdfJsModule> | undefined

async function loadPdfJs(): Promise<PdfJsModule> {
  pdfJsModulePromise ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    return pdfjs
  })

  return pdfJsModulePromise
}

function createAllPages(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, index) => index + 1)
}

function getPdfAssetUrl(directory: 'cmaps' | 'iccs' | 'standard_fonts' | 'wasm'): string {
  return new URL(
    `${import.meta.env.BASE_URL}pdfjs/${directory}/`,
    window.location.href,
  ).href
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: PdfImageFormat,
  jpegQualityPercent: number,
) {
  const encoding = getPdfImageEncodingOptions(format, jpegQualityPercent)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('瀏覽器無法建立圖片檔案。'))
        }
      },
      encoding.mimeType,
      'quality' in encoding ? encoding.quality : undefined,
    )
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function usePdfImageConverter() {
  const selectedFile = ref<File | null>(null)
  const password = ref('')
  const documentState = ref<DocumentState>('idle')
  const conversionState = ref<ConversionState>('idle')
  const archiveState = ref<ArchiveState>('idle')
  const pageCount = ref(0)
  const format = ref<PdfImageFormat>('png')
  const dpi = ref<DpiOption>('150')
  const pageSelectionMode = ref<PageSelectionMode>('all')
  const pageRange = ref('')
  const jpegQuality = ref(90)
  const progressCompleted = ref(0)
  const progressTotal = ref(0)
  const documentMessage = ref('')
  const conversionMessage = ref('')
  const results = ref<PdfImageResult[]>([])

  let pdfDocument: PDFDocumentProxy | null = null
  let loadingTask: PDFDocumentLoadingTask | null = null
  let renderTask: RenderTask | null = null
  let loadSequence = 0
  let conversionSequence = 0

  const formatOptions: Array<{ label: string; value: PdfImageFormat }> = [
    { label: 'PNG', value: 'png' },
    { label: 'JPG', value: 'jpeg' },
  ]
  const dpiOptions: Array<{ label: string; value: DpiOption }> = [
    { label: '96 DPI', value: '96' },
    { label: '150 DPI', value: '150' },
    { label: '300 DPI', value: '300' },
  ]
  const pageSelectionOptions: Array<{ label: string; value: PageSelectionMode }> = [
    { label: '全部頁面', value: 'all' },
    { label: '指定頁碼', value: 'range' },
  ]

  const pageSelectionResult = computed<PdfPageRangeResult>(() => {
    if (documentState.value !== 'ready') {
      return { ok: false, pages: [] }
    }

    if (pageSelectionMode.value === 'all') {
      const issue = getPdfPageLimitIssue(pageCount.value)
      if (issue) {
        return { ok: false, issue, pages: [] }
      }

      return { ok: true, pages: createAllPages(pageCount.value) }
    }

    const result = parsePdfPageRange(pageRange.value, pageCount.value)
    if (!result.ok) {
      return result
    }

    const issue = getPdfPageLimitIssue(result.pages.length)
    return issue ? { ok: false, issue, pages: [] } : result
  })
  const pageSelectionIssue = computed(() => {
    if (pageSelectionResult.value.ok) {
      return ''
    }

    return pageSelectionResult.value.issue ?? ''
  })
  const selectedPageCount = computed(() => pageSelectionResult.value.pages.length)
  const canConvert = computed(
    () =>
      documentState.value === 'ready' &&
      pageSelectionResult.value.ok &&
      selectedPageCount.value > 0 &&
      conversionState.value !== 'converting',
  )
  const progressPercent = computed(() => {
    if (progressTotal.value === 0) {
      return 0
    }

    return Math.round((progressCompleted.value / progressTotal.value) * 100)
  })
  const documentStateLabel = computed(() => {
    switch (documentState.value) {
      case 'loading':
        return '讀取中'
      case 'ready':
        return `${pageCount.value} 頁`
      case 'password-required':
        return '需要密碼'
      case 'failed':
        return '讀取失敗'
      default:
        return '尚未選擇'
    }
  })
  const isBusy = computed(
    () =>
      documentState.value === 'loading' ||
      conversionState.value === 'converting' ||
      archiveState.value === 'preparing',
  )

  function revokeResults() {
    for (const result of results.value) {
      URL.revokeObjectURL(result.url)
    }
  }

  function clearResults() {
    revokeResults()
    results.value = []
    progressCompleted.value = 0
    progressTotal.value = 0
    conversionState.value = 'idle'
    archiveState.value = 'idle'
    conversionMessage.value = ''
  }

  function cancelConversion() {
    if (conversionState.value !== 'converting') {
      return
    }

    conversionSequence += 1
    conversionState.value = 'cancelled'
    conversionMessage.value = '已取消轉換；完成的圖片仍可下載。'
    password.value = ''
    renderTask?.cancel()
    void destroyPdfDocument()
  }

  async function destroyPdfDocument() {
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

  async function loadDocument(preservePageRange = false) {
    const file = selectedFile.value
    if (!file) {
      return
    }

    const sequence = ++loadSequence
    documentState.value = 'loading'
    pageCount.value = 0
    documentMessage.value = ''
    await destroyPdfDocument()

    let pdfjs: PdfJsModule | null = null
    let task: PDFDocumentLoadingTask | null = null

    try {
      pdfjs = await loadPdfJs()
      const data = new Uint8Array(await file.arrayBuffer())

      if (sequence !== loadSequence) {
        return
      }

      task = pdfjs.getDocument({
        data,
        password: password.value || undefined,
        cMapPacked: true,
        cMapUrl: getPdfAssetUrl('cmaps'),
        iccUrl: getPdfAssetUrl('iccs'),
        stopAtErrors: true,
        standardFontDataUrl: getPdfAssetUrl('standard_fonts'),
        useWasm: true,
        wasmUrl: getPdfAssetUrl('wasm'),
        canvasMaxAreaInBytes: MAX_PDF_IMAGE_PIXELS * 4,
      })
      loadingTask = task
      const loadedDocument = await task.promise

      if (sequence !== loadSequence) {
        await task.destroy()
        return
      }

      pdfDocument = loadedDocument
      pageCount.value = loadedDocument.numPages
      documentState.value = 'ready'
      if (!preservePageRange) {
        pageRange.value = loadedDocument.numPages > 1 ? `1-${loadedDocument.numPages}` : '1'
      }
      documentMessage.value = ''
    } catch (error) {
      if (sequence !== loadSequence) {
        return
      }

      if (pdfjs && error instanceof pdfjs.PasswordException) {
        documentState.value = 'password-required'
        documentMessage.value =
          error.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD
            ? '密碼不正確，請重新輸入。'
            : '這份 PDF 受到密碼保護，請輸入開啟密碼。'
      } else if (pdfjs && error instanceof pdfjs.InvalidPDFException) {
        password.value = ''
        documentState.value = 'failed'
        documentMessage.value = '檔案不是有效的 PDF，或內容已損壞。'
      } else {
        password.value = ''
        documentState.value = 'failed'
        documentMessage.value = '無法讀取這份 PDF，請確認檔案後再試一次。'
      }

      if (task) {
        await task.destroy().catch(() => undefined)
      }
      if (loadingTask === task) {
        loadingTask = null
      }
    }
  }

  async function selectFile(file: File) {
    cancelConversion()
    clearResults()
    loadSequence += 1
    await destroyPdfDocument()
    password.value = ''

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
      documentMessage.value = 'PDF 檔案不可超過 100 MB。'
      return
    }

    selectedFile.value = file
    documentState.value = 'idle'
    await loadDocument()
  }

  async function unlockDocument() {
    if (!password.value) {
      documentMessage.value = '請輸入 PDF 開啟密碼。'
      return
    }

    await loadDocument()
  }

  async function clearFile() {
    loadSequence += 1
    conversionSequence += 1
    renderTask?.cancel()
    renderTask = null
    clearResults()
    selectedFile.value = null
    password.value = ''
    pageCount.value = 0
    pageRange.value = ''
    documentState.value = 'idle'
    documentMessage.value = ''
    conversionMessage.value = ''
    await destroyPdfDocument()
  }

  async function convert() {
    const pages = [...pageSelectionResult.value.pages]
    if (!pageSelectionResult.value.ok || pages.length === 0) {
      return
    }

    if (!pdfDocument) {
      await loadDocument(true)
    }

    const documentProxy = pdfDocument
    if (!documentProxy) {
      return
    }

    clearResults()
    const sequence = ++conversionSequence
    const outputFormat = format.value
    const outputDpi = Number(dpi.value)
    const outputQuality = jpegQuality.value
    const outputPageCount = pageCount.value
    const outputSourceName = selectedFile.value?.name ?? 'pdf'
    conversionState.value = 'converting'
    progressTotal.value = pages.length
    conversionMessage.value = ''

    try {
      const outputSizes = new Map<number, { height: number; scale: number; width: number }>()
      let totalOutputPixels = 0

      for (const pageNumber of pages) {
        if (sequence !== conversionSequence) {
          return
        }

        let page: PDFPageProxy | null = null
        try {
          page = await documentProxy.getPage(pageNumber)
          const baseViewport = page.getViewport({ scale: 1 })
          const outputSize = calculatePdfOutputSize(
            baseViewport.width,
            baseViewport.height,
            outputDpi,
          )

          if (!outputSize.ok) {
            throw new Error(`第 ${pageNumber} 頁：${outputSize.issue}`)
          }

          totalOutputPixels += outputSize.pixels
          const batchPixelIssue = getPdfBatchPixelIssue(totalOutputPixels)
          if (batchPixelIssue) {
            throw new Error(batchPixelIssue)
          }

          outputSizes.set(pageNumber, outputSize)
        } finally {
          page?.cleanup()
        }
      }

      for (const pageNumber of pages) {
        if (sequence !== conversionSequence) {
          return
        }

        let page: PDFPageProxy | null = null
        const canvas = document.createElement('canvas')

        try {
          page = await documentProxy.getPage(pageNumber)
          const outputSize = outputSizes.get(pageNumber)
          if (!outputSize) {
            throw new Error(`無法取得第 ${pageNumber} 頁的輸出尺寸。`)
          }

          const viewport = page.getViewport({ scale: outputSize.scale })
          canvas.width = outputSize.width
          canvas.height = outputSize.height
          renderTask = page.render({
            canvas,
            viewport,
            background: '#ffffff',
          })
          await renderTask.promise

          if (sequence !== conversionSequence) {
            return
          }

          const blob = await canvasToBlob(canvas, outputFormat, outputQuality)
          if (sequence !== conversionSequence) {
            return
          }

          const filename = createPdfImageFilename(
            outputSourceName,
            pageNumber,
            outputPageCount,
            outputFormat,
          )
          results.value = [
            ...results.value,
            {
              pageNumber,
              filename,
              blob,
              url: URL.createObjectURL(blob),
              width: outputSize.width,
              height: outputSize.height,
            },
          ]
          progressCompleted.value += 1
        } finally {
          renderTask = null
          canvas.width = 0
          canvas.height = 0
          page?.cleanup()
        }
      }

      if (sequence === conversionSequence) {
        password.value = ''
        conversionState.value = 'completed'
        conversionMessage.value = `已完成 ${results.value.length} 張圖片。`
        await destroyPdfDocument()
      }
    } catch (error) {
      if (sequence !== conversionSequence) {
        return
      }

      password.value = ''
      conversionState.value = 'failed'
      conversionMessage.value = error instanceof Error ? error.message : '轉換失敗，請稍後再試。'
      await destroyPdfDocument()
    }
  }

  function downloadResult(result: PdfImageResult) {
    triggerDownload(result.blob, result.filename)
  }

  async function downloadAll() {
    if (results.value.length === 0 || !selectedFile.value) {
      return
    }
    if (results.value.length === 1) {
      downloadResult(results.value[0])
      return
    }

    archiveState.value = 'preparing'

    try {
      const { zipSync } = await import('fflate')
      const entries: Record<string, Uint8Array> = {}

      for (const result of results.value) {
        entries[result.filename] = new Uint8Array(await result.blob.arrayBuffer())
      }

      const archive = zipSync(entries, { level: 0 })
      triggerDownload(
        new Blob([archive], { type: 'application/zip' }),
        createPdfArchiveFilename(selectedFile.value.name),
      )
      archiveState.value = 'idle'
    } catch {
      archiveState.value = 'failed'
      conversionMessage.value = '無法建立 ZIP，仍可逐張下載圖片。'
    }
  }

  onScopeDispose(() => {
    loadSequence += 1
    conversionSequence += 1
    renderTask?.cancel()
    revokeResults()
    void loadingTask?.destroy()
    if (!loadingTask) {
      void pdfDocument?.cleanup()
    }
  })

  return {
    archiveState,
    canConvert,
    cancelConversion,
    clearFile,
    clearResults,
    conversionState,
    conversionMessage,
    convert,
    documentState,
    documentStateLabel,
    documentMessage,
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
  }
}
