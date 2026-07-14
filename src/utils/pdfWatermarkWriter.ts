import {
  DecompressionBombError,
  EncryptedPDFError,
  PDFDocument,
  degrees,
  type PDFImage,
} from '@pdfme/pdf-lib'
import {
  createPdfWatermarkPlacements,
  type PdfWatermarkPlacement,
  type PdfWatermarkPageRotation,
} from './pdfWatermark'

export type PdfWatermarkImageFormat = 'png' | 'jpeg'
export type PdfWatermarkLayout = 'center' | 'tile'

export interface PdfWatermarkWriterOptions {
  horizontalSpacingRatio?: number
  layout: PdfWatermarkLayout
  opacity: number
  rotation: number
  verticalSpacingRatio?: number
  widthRatio: number
}

export interface PdfWatermarkWriterInput {
  pdfBytes: Uint8Array
  selectedPages: number[]
  watermarkBytes: Uint8Array
  watermarkFormat: PdfWatermarkImageFormat
  options: PdfWatermarkWriterOptions
}

export interface PdfWatermarkWriterProgress {
  completedPages: number
  pageNumber: number
  percent: number
  totalPages: number
}

export type PdfWatermarkWriterProgressHandler = (
  progress: PdfWatermarkWriterProgress,
) => void

export type PdfWatermarkWriterErrorCode =
  | 'DECOMPRESSION_BOMB'
  | 'ENCRYPTED_PDF'
  | 'INVALID_IMAGE'
  | 'INVALID_OPTIONS'
  | 'INVALID_PAGE_SELECTION'
  | 'INVALID_PDF'
  | 'UNKNOWN'

const ERROR_MESSAGES: Record<PdfWatermarkWriterErrorCode, string> = {
  DECOMPRESSION_BOMB: 'PDF 內含過大的解壓縮資料，已停止處理。',
  ENCRYPTED_PDF: '目前不支援加密或需要密碼的 PDF。',
  INVALID_IMAGE: '浮水印圖片無法解析，請使用有效的 PNG 或 JPEG。',
  INVALID_OPTIONS: '浮水印設定無效，請調整後再試一次。',
  INVALID_PAGE_SELECTION: '選取的頁碼不在 PDF 頁面範圍內。',
  INVALID_PDF: 'PDF 檔案已損壞或格式不受支援。',
  UNKNOWN: '產生浮水印 PDF 時發生未預期的錯誤。',
}

const MAX_TOTAL_TILE_PLACEMENTS = 10_000

export class PdfWatermarkWriterError extends Error {
  readonly code: PdfWatermarkWriterErrorCode

  constructor(code: PdfWatermarkWriterErrorCode, message = ERROR_MESSAGES[code]) {
    super(message)
    this.name = 'PdfWatermarkWriterError'
    this.code = code
  }
}

export async function addPdfWatermark(
  input: PdfWatermarkWriterInput,
  onProgress?: PdfWatermarkWriterProgressHandler,
): Promise<Uint8Array> {
  validateByteInputs(input)
  validateWriterOptions(input.options)

  let document: PDFDocument
  let pageCount: number
  try {
    document = await PDFDocument.load(input.pdfBytes, { updateMetadata: false })
    pageCount = document.getPageCount()
  } catch (error) {
    const mappedError = mapPdfWatermarkWriterError(error)
    throw mappedError.code === 'UNKNOWN'
      ? new PdfWatermarkWriterError('INVALID_PDF')
      : mappedError
  }

  if (document.isEncrypted) {
    throw new PdfWatermarkWriterError('ENCRYPTED_PDF')
  }

  const selectedPages = normalizeSelectedPages(input.selectedPages, pageCount)

  let watermarkImage: PDFImage
  try {
    watermarkImage =
      input.watermarkFormat === 'png'
        ? await document.embedPng(input.watermarkBytes)
        : await document.embedJpg(input.watermarkBytes)
  } catch (error) {
    const mappedError = mapPdfWatermarkWriterError(error)
    throw mappedError.code === 'DECOMPRESSION_BOMB'
      ? mappedError
      : new PdfWatermarkWriterError('INVALID_IMAGE')
  }

  const totalPages = selectedPages.length
  const pagePlans: Array<{
    pageNumber: number
    placements: PdfWatermarkPlacement[]
  }> = []
  let totalPlacementCount = 0

  for (const pageNumber of selectedPages) {
    const page = document.getPage(pageNumber - 1)
    const cropBox = page.getCropBox()
    const pageRotation = getPageRotation(page.getRotation().angle)
    const visualWidth =
      pageRotation === 90 || pageRotation === 270 ? cropBox.height : cropBox.width
    const visualHeight =
      pageRotation === 90 || pageRotation === 270 ? cropBox.width : cropBox.height
    const width = visualWidth * input.options.widthRatio
    const height = width * (watermarkImage.height / watermarkImage.width)
    const sharedPlacementOptions = {
      angle: input.options.rotation,
      cropBox,
      pageRotation,
      watermarkSize: { height, width },
    }
    const placementResult =
      input.options.layout === 'tile'
        ? createPdfWatermarkPlacements({
            ...sharedPlacementOptions,
            horizontalSpacing:
              visualWidth * (input.options.horizontalSpacingRatio ?? 0.08),
            layout: 'tile',
            verticalSpacing:
              visualHeight * (input.options.verticalSpacingRatio ?? 0.08),
          })
        : createPdfWatermarkPlacements({
            ...sharedPlacementOptions,
            layout: 'center',
          })

    if (!placementResult.ok) {
      throw new PdfWatermarkWriterError('INVALID_OPTIONS', placementResult.issue)
    }

    totalPlacementCount += placementResult.placements.length
    if (
      input.options.layout === 'tile' &&
      (!Number.isSafeInteger(totalPlacementCount) ||
        totalPlacementCount > MAX_TOTAL_TILE_PLACEMENTS)
    ) {
      throw new PdfWatermarkWriterError(
        'INVALID_OPTIONS',
        `整份 PDF 的平鋪浮水印總數超過安全上限（最多 ${MAX_TOTAL_TILE_PLACEMENTS.toLocaleString('en-US')} 個），請加大浮水印或間距、減少頁數，或改用置中。`,
      )
    }

    pagePlans.push({ pageNumber, placements: placementResult.placements })
  }

  for (const [index, pagePlan] of pagePlans.entries()) {
    const page = document.getPage(pagePlan.pageNumber - 1)
    for (const placement of pagePlan.placements) {
      page.drawImage(watermarkImage, {
        height: placement.height,
        opacity: input.options.opacity,
        rotate: degrees(placement.rotation),
        width: placement.width,
        x: placement.x,
        y: placement.y,
      })
    }

    const completedPages = index + 1
    onProgress?.({
      completedPages,
      pageNumber: pagePlan.pageNumber,
      percent: Math.round((completedPages / totalPages) * 100),
      totalPages,
    })
  }

  try {
    return await document.save({ updateFieldAppearances: false })
  } catch (error) {
    throw mapPdfWatermarkWriterError(error)
  }
}

export function mapPdfWatermarkWriterError(error: unknown): PdfWatermarkWriterError {
  if (error instanceof PdfWatermarkWriterError) return error

  if (
    error instanceof DecompressionBombError ||
    hasErrorName(error, 'DecompressionBombError')
  ) {
    return new PdfWatermarkWriterError('DECOMPRESSION_BOMB')
  }

  const message = error instanceof Error ? error.message.toUpperCase() : ''
  if (
    error instanceof EncryptedPDFError ||
    hasErrorName(error, 'EncryptedPDFError') ||
    message.includes('NEEDS PASSWORD') ||
    message.includes('PASSWORD REQUIRED')
  ) {
    return new PdfWatermarkWriterError('ENCRYPTED_PDF')
  }

  if (isPdfParsingError(error)) {
    return new PdfWatermarkWriterError('INVALID_PDF')
  }

  return new PdfWatermarkWriterError('UNKNOWN')
}

function validateByteInputs(input: PdfWatermarkWriterInput): void {
  if (!(input.pdfBytes instanceof Uint8Array) || input.pdfBytes.byteLength === 0) {
    throw new PdfWatermarkWriterError('INVALID_PDF')
  }

  if (
    !(input.watermarkBytes instanceof Uint8Array) ||
    input.watermarkBytes.byteLength === 0 ||
    (input.watermarkFormat !== 'png' && input.watermarkFormat !== 'jpeg')
  ) {
    throw new PdfWatermarkWriterError('INVALID_IMAGE')
  }
}

function validateWriterOptions(options: PdfWatermarkWriterOptions): void {
  if (
    (options.layout !== 'center' && options.layout !== 'tile') ||
    !isFiniteInRange(options.opacity, 0, 1) ||
    !isFiniteInRange(options.widthRatio, 0.05, 1) ||
    !Number.isFinite(options.rotation) ||
    (options.horizontalSpacingRatio !== undefined &&
      !isFiniteInRange(options.horizontalSpacingRatio, 0, 2)) ||
    (options.verticalSpacingRatio !== undefined &&
      !isFiniteInRange(options.verticalSpacingRatio, 0, 2))
  ) {
    throw new PdfWatermarkWriterError('INVALID_OPTIONS')
  }
}

function normalizeSelectedPages(selectedPages: number[], pageCount: number): number[] {
  if (!Array.isArray(selectedPages)) {
    throw new PdfWatermarkWriterError('INVALID_PAGE_SELECTION')
  }

  const normalized = [...new Set(selectedPages)].sort((left, right) => left - right)

  if (
    normalized.length === 0 ||
    normalized.some(
      (pageNumber) =>
        !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount,
    )
  ) {
    throw new PdfWatermarkWriterError('INVALID_PAGE_SELECTION')
  }

  return normalized
}

function getPageRotation(rotation: number): PdfWatermarkPageRotation {
  const normalized = ((rotation % 360) + 360) % 360
  if (
    normalized === 0 ||
    normalized === 90 ||
    normalized === 180 ||
    normalized === 270
  ) {
    return normalized
  }

  throw new PdfWatermarkWriterError('INVALID_PDF')
}

function isFiniteInRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum
}

function hasErrorName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name
}

function isPdfParsingError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return (
    /(?:PDF|PageTree|ObjectParsing|NumberParsing|MissingKeyword)/.test(error.name) ||
    /(?:PDF header|Failed to parse|corrupt|invalid PDF)/i.test(error.message)
  )
}
