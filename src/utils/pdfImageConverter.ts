export interface PdfPageRangeResult {
  ok: boolean
  pages: number[]
  issue?: string
}

export const MAX_PDF_IMAGE_PIXELS = 34_000_000
export const MAX_PDF_CONVERSION_PAGES = 20
export const MAX_PDF_BATCH_PIXELS = 100_000_000

export type PdfImageFormat = 'png' | 'jpeg'

export type PdfImageEncodingOptions =
  | { mimeType: 'image/png' }
  | { mimeType: 'image/jpeg'; quality: number }

export type PdfOutputSizeResult =
  | {
      ok: true
      width: number
      height: number
      pixels: number
      scale: number
    }
  | {
      ok: false
      issue: string
    }

const PAGE_RANGE_FORMAT_ISSUE = '頁碼格式不正確，請使用例如 1-3, 5 的格式。'

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

export function getPdfBatchPixelIssue(
  totalPixels: number,
  maxPixels = MAX_PDF_BATCH_PIXELS,
): string {
  return totalPixels > maxPixels
    ? `選取頁面的總輸出尺寸超過安全上限（${maxPixels.toLocaleString('zh-TW')} 像素），請減少頁數或降低 DPI。`
    : ''
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
