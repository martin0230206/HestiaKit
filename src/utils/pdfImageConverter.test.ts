import { describe, expect, it } from 'vitest'
import {
  MAX_PDF_IMAGE_PIXELS,
  assessPdfConversionRisk,
  calculatePdfOutputSize,
  createPdfConversionBatches,
  createPdfArchiveFilename,
  createPdfImageFilename,
  formatPdfPageRange,
  formatPdfFileSize,
  getPdfImageEncodingOptions,
  getPdfPageLimitIssue,
  parsePdfPageRange,
} from './pdfImageConverter'

describe('pdfImageConverter', () => {
  describe('createPdfConversionBatches', () => {
    it('splits 24 pages into six sequential batches under the pixel budget', () => {
      const pages = Array.from({ length: 24 }, (_, index) => ({
        height: 5_000,
        pageNumber: index + 1,
        pixels: 25_000_000,
        width: 5_000,
      }))

      expect(createPdfConversionBatches(pages)).toEqual({
        batches: [
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [9, 10, 11, 12],
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, 24],
        ],
        unbatchablePages: [],
      })
    })
  })

  describe('assessPdfConversionRisk', () => {
    it('requires confirmation and suggests a safe prefix for a large architecture diagram', () => {
      expect(
        assessPdfConversionRisk(
          [
            { pageNumber: 1, width: 6_096, height: 3_120, pixels: 19_019_520 },
            { pageNumber: 2, width: 5_076, height: 3_024, pixels: 15_349_824 },
            { pageNumber: 3, width: 7_104, height: 3_888, pixels: 27_620_352 },
            { pageNumber: 4, width: 5_076, height: 3_024, pixels: 15_349_824 },
            { pageNumber: 5, width: 7_104, height: 3_888, pixels: 27_620_352 },
          ],
          96,
        ),
      ).toEqual({
        dpi: 96,
        exceedsBatchPixels: true,
        exceedsCanvasLimit: false,
        exceedsPageCount: false,
        exceedsSinglePagePixels: false,
        largestPagePixels: 27_620_352,
        pageCount: 5,
        requiresConfirmation: true,
        suggestedBatches: [[1, 2, 3, 4], [5]],
        totalPixels: 104_959_872,
        unbatchablePages: [],
      })
    })

    it('distinguishes a browser canvas limit from overridable safety limits', () => {
      expect(
        assessPdfConversionRisk(
          [
            {
              pageNumber: 3,
              width: 22_200,
              height: 12_150,
              pixels: 269_730_000,
            },
          ],
          300,
        ),
      ).toMatchObject({
        exceedsCanvasLimit: true,
        requiresConfirmation: true,
        suggestedBatches: [],
        unbatchablePages: [3],
      })
    })

    it('also catches a canvas dimension above the browser limit', () => {
      expect(
        assessPdfConversionRisk(
          [{ pageNumber: 1, width: 32_768, height: 1, pixels: 32_768 }],
          96,
        ).exceedsCanvasLimit,
      ).toBe(true)
    })
  })

  describe('parsePdfPageRange', () => {
    it('parses ranges, ignores duplicates, and keeps pages in ascending order', () => {
      expect(parsePdfPageRange('5, 1-3, 3', 6)).toEqual({
        ok: true,
        pages: [1, 2, 3, 5],
      })
    })

    it('rejects malformed, reversed, and out-of-bounds ranges', () => {
      expect(parsePdfPageRange('1,,3', 6)).toEqual({
        ok: false,
        issue: '頁碼格式不正確，請使用例如 1-3, 5 的格式。',
        pages: [],
      })
      expect(parsePdfPageRange('4-2', 6).ok).toBe(false)
      expect(parsePdfPageRange('1-7', 6)).toEqual({
        ok: false,
        issue: '頁碼必須介於 1 與 6 之間。',
        pages: [],
      })
    })

    it('stops expanding a range as soon as it exceeds the batch limit', () => {
      expect(parsePdfPageRange('1-1000000', 1_000_000)).toEqual({
        ok: false,
        issue: '單次最多轉換 20 頁，請改用指定頁碼分批處理。',
        pages: [],
      })
    })
  })

  describe('formatPdfPageRange', () => {
    it('formats contiguous and separated pages without expanding the selection', () => {
      expect(formatPdfPageRange([1, 2, 3, 5, 7, 8])).toBe('1-3, 5, 7-8')
    })
  })

  describe('calculatePdfOutputSize', () => {
    it('converts PDF points into output pixels at the requested DPI', () => {
      expect(calculatePdfOutputSize(595.28, 841.89, 300)).toEqual({
        ok: true,
        width: 2481,
        height: 3508,
        pixels: 8_703_348,
        scale: 300 / 72,
      })
    })

    it('rejects pages that would exceed the safe canvas limit', () => {
      expect(calculatePdfOutputSize(2_000, 2_000, 300)).toEqual({
        ok: false,
        issue: `輸出尺寸超過安全上限（${MAX_PDF_IMAGE_PIXELS.toLocaleString('zh-TW')} 像素）。`,
      })
    })
  })

  describe('createPdfImageFilename', () => {
    it('uses a stable padded page number and the matching extension', () => {
      expect(createPdfImageFilename('年度報表.PDF', 1, 12, 'png')).toBe(
        '年度報表-page-001.png',
      )
      expect(createPdfImageFilename('年度報表.pdf', 12, 12, 'jpeg')).toBe(
        '年度報表-page-012.jpg',
      )
    })

    it('removes unsafe filename characters and supplies a fallback name', () => {
      expect(createPdfImageFilename('報表<最終>.pdf', 2, 3, 'png')).toBe(
        '報表-最終-page-002.png',
      )
      expect(createPdfImageFilename('.pdf', 1, 1, 'jpeg')).toBe('pdf-page-001.jpg')
    })

    it('uses the same safe base name for a multi-page archive', () => {
      expect(createPdfArchiveFilename('報表<最終>.pdf')).toBe('報表-最終-images.zip')
    })
  })

  describe('getPdfImageEncodingOptions', () => {
    it('normalizes JPG quality and leaves PNG quality unset', () => {
      expect(getPdfImageEncodingOptions('jpeg', 125)).toEqual({
        mimeType: 'image/jpeg',
        quality: 1,
      })
      expect(getPdfImageEncodingOptions('jpeg', -10)).toEqual({
        mimeType: 'image/jpeg',
        quality: 0,
      })
      expect(getPdfImageEncodingOptions('png', 75)).toEqual({
        mimeType: 'image/png',
      })
    })
  })

  describe('page and file display limits', () => {
    it('limits each conversion batch and formats file sizes', () => {
      expect(getPdfPageLimitIssue(20)).toBe('')
      expect(getPdfPageLimitIssue(21)).toBe(
        '單次最多轉換 20 頁，請改用指定頁碼分批處理。',
      )
      expect(formatPdfFileSize(900)).toBe('900 B')
      expect(formatPdfFileSize(2_604)).toBe('2.5 KB')
    })
  })
})
