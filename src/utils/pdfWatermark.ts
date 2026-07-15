export type PdfWatermarkPageRangeResult =
  | { ok: true; pages: number[] }
  | { ok: false; issue: string; pages: [] }

export interface PdfWatermarkNumericOptions {
  angle: number
  opacity: number
  scale: number
  spacing: number
}

export interface PdfWatermarkRect {
  height: number
  width: number
  x: number
  y: number
}

export interface PdfWatermarkSize {
  height: number
  width: number
}

export type PdfWatermarkPageRotation = 0 | 90 | 180 | 270

export type PdfWatermarkImageInspectionResult =
  | { format: 'png' | 'jpeg'; height: number; ok: true; width: number }
  | { issue: string; ok: false }

export interface PdfWatermarkPlacement extends PdfWatermarkSize {
  /**
   * 傳給 PDF writer 的逆時針旋轉角度，已包含頁面 `/Rotate` 的補償。
   */
  rotation: number
  x: number
  y: number
}

export type PdfWatermarkPlacementResult =
  | { ok: true; placements: PdfWatermarkPlacement[] }
  | { ok: false; issue: string; placements: [] }

export interface CreateCenteredPdfWatermarkPlacementsOptions {
  /** 使用者在套用頁面 `/Rotate` 後所看到的逆時針角度。 */
  angle?: number
  cropBox: PdfWatermarkRect
  layout: 'center'
  pageRotation: PdfWatermarkPageRotation
  watermarkSize: PdfWatermarkSize
}

export interface CreateTiledPdfWatermarkPlacementsOptions
  extends Omit<CreateCenteredPdfWatermarkPlacementsOptions, 'layout'> {
  horizontalSpacing?: number
  layout: 'tile'
  maxPlacements?: number
  verticalSpacing?: number
}

export type CreatePdfWatermarkPlacementsOptions =
  | CreateCenteredPdfWatermarkPlacementsOptions
  | CreateTiledPdfWatermarkPlacementsOptions

const DEFAULT_PDF_WATERMARK_OPTIONS: PdfWatermarkNumericOptions = {
  angle: -45,
  opacity: 0.25,
  scale: 0.35,
  spacing: 36,
}

const PDF_DIGITAL_SIGNATURE_MARKERS = [
  Uint8Array.from([0x2f, 0x42, 0x79, 0x74, 0x65, 0x52, 0x61, 0x6e, 0x67, 0x65]),
  Uint8Array.from([0x2f, 0x44, 0x6f, 0x63, 0x4d, 0x44, 0x50]),
]

export function createPdfWatermarkFilename(originalFilename: string): string {
  const withoutExtension = originalFilename.replace(/(?:\.pdf)+$/i, '')
  const sanitized = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[ .-]+|[ .-]+$/g, '')
  const baseName = sanitized || 'pdf'

  return `${baseName}-watermarked.pdf`
}

export function hasPdfDigitalSignatureMarker(bytes: Uint8Array): boolean {
  for (let offset = 0; offset < bytes.length; offset += 1) {
    if (bytes[offset] !== 0x2f) continue

    for (const marker of PDF_DIGITAL_SIGNATURE_MARKERS) {
      const end = offset + marker.length
      if (end > bytes.length) continue

      let matches = true
      for (let index = 0; index < marker.length; index += 1) {
        if (bytes[offset + index] !== marker[index]) {
          matches = false
          break
        }
      }

      if (matches && (end === bytes.length || isPdfNameDelimiter(bytes[end] as number))) {
        return true
      }
    }
  }

  return false
}

export function inspectPdfWatermarkImage(
  bytes: Uint8Array,
): PdfWatermarkImageInspectionResult {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const isPng =
    bytes.length >= 24 &&
    pngSignature.every((value, index) => bytes[index] === value) &&
    bytes[12] === 0x49 &&
    bytes[13] === 0x48 &&
    bytes[14] === 0x44 &&
    bytes[15] === 0x52

  if (isPng) {
    return createImageInspectionResult(
      'png',
      readUint32BigEndian(bytes, 16),
      readUint32BigEndian(bytes, 20),
    )
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2

    while (offset < bytes.length) {
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1
      if (offset >= bytes.length) break

      const marker = bytes[offset++] as number
      if (marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue
      if (offset + 1 >= bytes.length) break

      const segmentLength = readUint16BigEndian(bytes, offset)
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break

      if (isJpegStartOfFrameMarker(marker) && segmentLength >= 7) {
        return createImageInspectionResult(
          'jpeg',
          readUint16BigEndian(bytes, offset + 5),
          readUint16BigEndian(bytes, offset + 3),
        )
      }

      offset += segmentLength
    }
  }

  return { issue: '浮水印圖片必須是有效的 PNG 或 JPEG。', ok: false }
}

export function normalizePdfWatermarkOptions(
  options: PdfWatermarkNumericOptions,
): PdfWatermarkNumericOptions {
  const angle = normalizeAngle(options.angle, DEFAULT_PDF_WATERMARK_OPTIONS.angle)

  return {
    angle: Object.is(angle, -0) ? 0 : angle,
    opacity: clampFinite(options.opacity, 0, 1, DEFAULT_PDF_WATERMARK_OPTIONS.opacity),
    scale: clampFinite(options.scale, 0.05, 1, DEFAULT_PDF_WATERMARK_OPTIONS.scale),
    spacing: clampFinite(
      options.spacing,
      0,
      1_000,
      DEFAULT_PDF_WATERMARK_OPTIONS.spacing,
    ),
  }
}

export function createPdfWatermarkPlacements(
  options: CreatePdfWatermarkPlacementsOptions,
): PdfWatermarkPlacementResult {
  const dimensionValues = [
    options.cropBox.height,
    options.cropBox.width,
    options.watermarkSize.height,
    options.watermarkSize.width,
  ]
  const originValues = [options.cropBox.x, options.cropBox.y]

  if (
    dimensionValues.some((value) => !Number.isFinite(value) || value <= 0) ||
    originValues.some((value) => !Number.isFinite(value))
  ) {
    return {
      issue: '頁面與浮水印尺寸必須是大於 0 的有限數值。',
      ok: false,
      placements: [],
    }
  }

  if (![0, 90, 180, 270].includes(options.pageRotation)) {
    return {
      issue: '頁面旋轉角度必須是 0、90、180 或 270 度。',
      ok: false,
      placements: [],
    }
  }

  const angle = normalizeAngle(options.angle ?? 0, 0)
  const bounds = getRotatedBounds(options.watermarkSize, angle)
  const visualWidth =
    options.pageRotation === 90 || options.pageRotation === 270
      ? options.cropBox.height
      : options.cropBox.width
  const visualHeight =
    options.pageRotation === 90 || options.pageRotation === 270
      ? options.cropBox.width
      : options.cropBox.height

  if (options.layout === 'tile') {
    const horizontalSpacing = clampFinite(options.horizontalSpacing ?? 36, 0, 1_000, 36)
    const verticalSpacing = clampFinite(options.verticalSpacing ?? 36, 0, 1_000, 36)
    const maxPlacements =
      Number.isSafeInteger(options.maxPlacements) && (options.maxPlacements ?? 0) > 0
        ? (options.maxPlacements as number)
        : 1_000
    const columns = Math.max(
      1,
      Math.ceil((visualWidth + horizontalSpacing) / (bounds.width + horizontalSpacing)),
    )
    const rows = Math.max(
      1,
      Math.ceil((visualHeight + verticalSpacing) / (bounds.height + verticalSpacing)),
    )
    const exceedsLimit =
      !Number.isSafeInteger(columns) ||
      !Number.isSafeInteger(rows) ||
      rows > maxPlacements ||
      columns > Math.floor(maxPlacements / rows)

    if (exceedsLimit) {
      return {
        issue: `平鋪浮水印數量超過安全上限（最多 ${maxPlacements} 個），請加大浮水印或間距。`,
        ok: false,
        placements: [],
      }
    }

    const tiledWidth = columns * bounds.width + (columns - 1) * horizontalSpacing
    const tiledHeight = rows * bounds.height + (rows - 1) * verticalSpacing
    const startX = (visualWidth - tiledWidth) / 2 - bounds.minX
    const startY = (visualHeight - tiledHeight) / 2 - bounds.minY
    const placements: PdfWatermarkPlacement[] = []

    for (let row = 0; row < rows; row += 1) {
      const visualY = startY + row * (bounds.height + verticalSpacing)

      for (let column = 0; column < columns; column += 1) {
        const visualX = startX + column * (bounds.width + horizontalSpacing)
        const anchor = visualPointToPdfPoint(
          visualX,
          visualY,
          options.cropBox,
          options.pageRotation,
        )

        placements.push({
          height: options.watermarkSize.height,
          rotation: options.pageRotation + angle,
          width: options.watermarkSize.width,
          ...anchor,
        })
      }
    }

    return { ok: true, placements }
  }

  const visualX = (visualWidth - bounds.width) / 2 - bounds.minX
  const visualY = (visualHeight - bounds.height) / 2 - bounds.minY
  const anchor = visualPointToPdfPoint(
    visualX,
    visualY,
    options.cropBox,
    options.pageRotation,
  )

  return {
    ok: true,
    placements: [
      {
        height: options.watermarkSize.height,
        rotation: options.pageRotation + angle,
        width: options.watermarkSize.width,
        ...anchor,
      },
    ],
  }
}

export function parsePdfWatermarkPageRange(
  input: string,
  pageCount: number,
  maxPages = pageCount,
): PdfWatermarkPageRangeResult {
  if (!Number.isSafeInteger(pageCount) || pageCount < 1) {
    return {
      ok: false,
      issue: 'PDF 頁數必須是大於 0 的整數。',
      pages: [],
    }
  }

  if (!Number.isSafeInteger(maxPages) || maxPages < 1) {
    return {
      ok: false,
      issue: '頁數上限必須是大於 0 的整數。',
      pages: [],
    }
  }

  const pages = new Set<number>()

  for (const segment of input.split(',')) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(segment.trim())
    if (!match) {
      return {
        ok: false,
        issue: '頁碼格式不正確，請使用例如 1-3, 5 的格式。',
        pages: [],
      }
    }

    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])

    if (start > end) {
      return {
        ok: false,
        issue: '頁碼格式不正確，請使用例如 1-3, 5 的格式。',
        pages: [],
      }
    }

    if (start < 1 || end > pageCount) {
      return {
        ok: false,
        issue: `頁碼必須介於 1 與 ${pageCount} 之間。`,
        pages: [],
      }
    }

    if (end - start + 1 > maxPages) {
      return {
        ok: false,
        issue: `單次最多處理 ${maxPages} 頁，請縮小頁碼範圍。`,
        pages: [],
      }
    }

    for (let page = start; page <= end; page += 1) {
      pages.add(page)
      if (pages.size > maxPages) {
        return {
          ok: false,
          issue: `單次最多處理 ${maxPages} 頁，請縮小頁碼範圍。`,
          pages: [],
        }
      }
    }
  }

  return { ok: true, pages: [...pages].sort((left, right) => left - right) }
}

function clampFinite(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function isPdfNameDelimiter(value: number): boolean {
  return (
    value === 0x00 ||
    value === 0x09 ||
    value === 0x0a ||
    value === 0x0c ||
    value === 0x0d ||
    value === 0x20 ||
    value === 0x25 ||
    value === 0x28 ||
    value === 0x29 ||
    value === 0x2f ||
    value === 0x3c ||
    value === 0x3e ||
    value === 0x5b ||
    value === 0x5d ||
    value === 0x7b ||
    value === 0x7d
  )
}

function createImageInspectionResult(
  format: 'png' | 'jpeg',
  width: number,
  height: number,
): PdfWatermarkImageInspectionResult {
  return width > 0 && height > 0
    ? { format, height, ok: true, width }
    : { issue: '浮水印圖片必須是有效的 PNG 或 JPEG。', ok: false }
}

function isJpegStartOfFrameMarker(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  )
}

function readUint16BigEndian(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] as number) << 8) | (bytes[offset + 1] as number)
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] as number) * 0x1000000 +
    (bytes[offset + 1] as number) * 0x10000 +
    (bytes[offset + 2] as number) * 0x100 +
    (bytes[offset + 3] as number)
  )
}

function getRotatedBounds(
  size: PdfWatermarkSize,
  angle: number,
): { height: number; minX: number; minY: number; width: number } {
  const radians = (angle * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const xCoordinates = [
    0,
    size.width * cosine,
    -size.height * sine,
    size.width * cosine - size.height * sine,
  ]
  const yCoordinates = [
    0,
    size.width * sine,
    size.height * cosine,
    size.width * sine + size.height * cosine,
  ]
  const minX = Math.min(...xCoordinates)
  const maxX = Math.max(...xCoordinates)
  const minY = Math.min(...yCoordinates)
  const maxY = Math.max(...yCoordinates)

  return { height: maxY - minY, minX, minY, width: maxX - minX }
}

function normalizeAngle(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  const angle = ((((value + 180) % 360) + 360) % 360) - 180
  return Object.is(angle, -0) ? 0 : angle
}

function visualPointToPdfPoint(
  visualX: number,
  visualY: number,
  cropBox: PdfWatermarkRect,
  pageRotation: PdfWatermarkPageRotation,
): { x: number; y: number } {
  switch (pageRotation) {
    case 90:
      return {
        x: cropBox.x + cropBox.width - visualY,
        y: cropBox.y + visualX,
      }
    case 180:
      return {
        x: cropBox.x + cropBox.width - visualX,
        y: cropBox.y + cropBox.height - visualY,
      }
    case 270:
      return {
        x: cropBox.x + visualY,
        y: cropBox.y + cropBox.height - visualX,
      }
    default:
      return { x: cropBox.x + visualX, y: cropBox.y + visualY }
  }
}
