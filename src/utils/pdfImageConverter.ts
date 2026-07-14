export interface PdfPageRangeResult {
  ok: boolean
  pages: number[]
  issue?: string
}

export const MAX_PDF_IMAGE_PIXELS = 34_000_000
export const MAX_PDF_CONVERSION_PAGES = 20
export const MAX_PDF_BATCH_PIXELS = 100_000_000
export const MAX_PDF_CANVAS_PIXELS = 268_435_456
export const MAX_PDF_CANVAS_DIMENSION = 32_767

export interface PdfPagePixelEstimate {
  height: number
  pageNumber: number
  pixels: number
  width: number
}

export interface PdfConversionBatchPlan {
  batches: number[][]
  unbatchablePages: number[]
}

export interface PdfConversionRiskEstimate {
  dpi: number
  exceedsBatchPixels: boolean
  exceedsCanvasLimit: boolean
  exceedsPageCount: boolean
  exceedsSinglePagePixels: boolean
  largestPagePixels: number
  pageCount: number
  requiresConfirmation: boolean
  suggestedBatches: number[][]
  totalPixels: number
  unbatchablePages: number[]
}

export type PdfImageFormat = 'png' | 'jpeg'

export type PdfImageEncodingOptions =
  | { mimeType: 'image/png' }
  | { mimeType: 'image/jpeg'; quality: number }

export interface PdfOutputSize {
  width: number
  height: number
  pixels: number
  scale: number
}

export type PdfOutputSizeResult =
  | ({ ok: true } & PdfOutputSize)
  | {
      ok: false
      issue: string
    }

const PAGE_RANGE_FORMAT_ISSUE = '頁碼格式不正確，請使用例如 1-3, 5 的格式。'

export function createPdfConversionBatches(
  pages: PdfPagePixelEstimate[],
): PdfConversionBatchPlan {
  const batches: number[][] = []
  const unbatchablePages: number[] = []
  let currentBatch: number[] = []
  let currentBatchPixels = 0

  const flushCurrentBatch = () => {
    if (currentBatch.length > 0) {
      batches.push(currentBatch)
      currentBatch = []
      currentBatchPixels = 0
    }
  }

  for (const page of pages) {
    if (page.pixels > MAX_PDF_IMAGE_PIXELS) {
      flushCurrentBatch()
      unbatchablePages.push(page.pageNumber)
      continue
    }

    if (
      currentBatch.length >= MAX_PDF_CONVERSION_PAGES ||
      currentBatchPixels + page.pixels > MAX_PDF_BATCH_PIXELS
    ) {
      flushCurrentBatch()
    }

    currentBatch.push(page.pageNumber)
    currentBatchPixels += page.pixels
  }

  flushCurrentBatch()

  return { batches, unbatchablePages }
}

export function assessPdfConversionRisk(
  pages: PdfPagePixelEstimate[],
  dpi: number,
): PdfConversionRiskEstimate {
  const totalPixels = pages.reduce((total, page) => total + page.pixels, 0)
  const largestPagePixels = pages.reduce(
    (largest, page) => Math.max(largest, page.pixels),
    0,
  )
  const batchPlan = createPdfConversionBatches(pages)
  const exceedsBatchPixels = totalPixels > MAX_PDF_BATCH_PIXELS
  const exceedsCanvasLimit = pages.some(
    (page) =>
      page.pixels > MAX_PDF_CANVAS_PIXELS ||
      page.width > MAX_PDF_CANVAS_DIMENSION ||
      page.height > MAX_PDF_CANVAS_DIMENSION,
  )
  const exceedsPageCount = pages.length > MAX_PDF_CONVERSION_PAGES
  const exceedsSinglePagePixels = largestPagePixels > MAX_PDF_IMAGE_PIXELS

  return {
    dpi,
    exceedsBatchPixels,
    exceedsCanvasLimit,
    exceedsPageCount,
    exceedsSinglePagePixels,
    largestPagePixels,
    pageCount: pages.length,
    requiresConfirmation:
      exceedsBatchPixels ||
      exceedsCanvasLimit ||
      exceedsPageCount ||
      exceedsSinglePagePixels,
    suggestedBatches: batchPlan.batches,
    totalPixels,
    unbatchablePages: batchPlan.unbatchablePages,
  }
}

export function parsePdfPageRange(
  input: string,
  pageCount: number,
  maxPages = MAX_PDF_CONVERSION_PAGES,
): PdfPageRangeResult {
  const segments = input.split(',').map((segment) => segment.trim())

  if (segments.some((segment) => segment.length === 0)) {
    return { ok: false, issue: PAGE_RANGE_FORMAT_ISSUE, pages: [] }
  }

  const pages = new Set<number>()

  for (const segment of segments) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(segment)
    if (!match) {
      return { ok: false, issue: PAGE_RANGE_FORMAT_ISSUE, pages: [] }
    }

    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])

    if (start > end) {
      return { ok: false, issue: PAGE_RANGE_FORMAT_ISSUE, pages: [] }
    }

    if (start < 1 || end > pageCount) {
      return {
        ok: false,
        issue: `頁碼必須介於 1 與 ${pageCount} 之間。`,
        pages: [],
      }
    }

    const rangeLimitIssue = getPdfPageLimitIssue(end - start + 1, maxPages)
    if (rangeLimitIssue) {
      return { ok: false, issue: rangeLimitIssue, pages: [] }
    }

    for (let page = start; page <= end; page += 1) {
      pages.add(page)
      const selectionLimitIssue = getPdfPageLimitIssue(pages.size, maxPages)
      if (selectionLimitIssue) {
        return { ok: false, issue: selectionLimitIssue, pages: [] }
      }
    }
  }

  return {
    ok: true,
    pages: [...pages].sort((left, right) => left - right),
  }
}

export function formatPdfPageRange(pages: number[]): string {
  const segments: string[] = []
  let rangeStart = pages[0]
  let previousPage = pages[0]

  for (const page of pages.slice(1)) {
    if (page === previousPage + 1) {
      previousPage = page
      continue
    }

    segments.push(
      rangeStart === previousPage ? `${rangeStart}` : `${rangeStart}-${previousPage}`,
    )
    rangeStart = page
    previousPage = page
  }

  if (rangeStart !== undefined && previousPage !== undefined) {
    segments.push(
      rangeStart === previousPage ? `${rangeStart}` : `${rangeStart}-${previousPage}`,
    )
  }

  return segments.join(', ')
}

export function calculatePdfOutputSize(
  widthInPoints: number,
  heightInPoints: number,
  dpi: number,
  maxPixels = MAX_PDF_IMAGE_PIXELS,
): PdfOutputSizeResult {
  if (
    !Number.isFinite(widthInPoints) ||
    !Number.isFinite(heightInPoints) ||
    !Number.isFinite(dpi) ||
    widthInPoints <= 0 ||
    heightInPoints <= 0 ||
    dpi <= 0
  ) {
    return { ok: false, issue: '無法計算這一頁的輸出尺寸。' }
  }

  const scale = dpi / 72
  const width = Math.ceil(widthInPoints * scale)
  const height = Math.ceil(heightInPoints * scale)
  const pixels = width * height

  if (pixels > maxPixels) {
    return {
      ok: false,
      issue: `輸出尺寸超過安全上限（${maxPixels.toLocaleString('zh-TW')} 像素）。`,
    }
  }

  return { ok: true, width, height, pixels, scale }
}

export function createPdfImageFilename(
  originalFilename: string,
  pageNumber: number,
  pageCount: number,
  format: PdfImageFormat,
): string {
  const baseName = getSafePdfBaseName(originalFilename)
  const pageNumberWidth = Math.max(3, String(pageCount).length)
  const paddedPageNumber = String(pageNumber).padStart(pageNumberWidth, '0')
  const extension = format === 'jpeg' ? 'jpg' : 'png'

  return `${baseName}-page-${paddedPageNumber}.${extension}`
}

export function createPdfArchiveFilename(originalFilename: string): string {
  return `${getSafePdfBaseName(originalFilename)}-images.zip`
}

export function getPdfImageEncodingOptions(
  format: PdfImageFormat,
  jpegQualityPercent: number,
): PdfImageEncodingOptions {
  if (format === 'png') {
    return { mimeType: 'image/png' }
  }

  const normalizedQuality = Math.min(100, Math.max(0, jpegQualityPercent)) / 100
  return { mimeType: 'image/jpeg', quality: normalizedQuality }
}

export function getPdfPageLimitIssue(
  selectedPageCount: number,
  maxPages = MAX_PDF_CONVERSION_PAGES,
): string {
  return selectedPageCount > maxPages
    ? `單次最多轉換 ${maxPages} 頁，請改用指定頁碼分批處理。`
    : ''
}

export function formatPdfFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`
}

function getSafePdfBaseName(filename: string): string {
  const withoutExtension = filename.replace(/\.pdf$/i, '')
  const sanitized = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[ .-]+|[ .-]+$/g, '')

  return sanitized || 'pdf'
}
