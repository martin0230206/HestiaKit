import { describe, expect, it } from 'vitest'
import {
  createPdfWatermarkFilename,
  createPdfWatermarkPlacements,
  hasPdfDigitalSignatureMarker,
  inspectPdfWatermarkImage,
  normalizePdfWatermarkOptions,
  parsePdfWatermarkPageRange,
} from './pdfWatermark'

describe('pdfWatermark', () => {
  describe('parsePdfWatermarkPageRange', () => {
    it('parses ranges, removes duplicates, and sorts selected pages', () => {
      expect(parsePdfWatermarkPageRange('5, 1-3, 3', 6)).toEqual({
        ok: true,
        pages: [1, 2, 3, 5],
      })
    })

    it('returns stable Traditional Chinese issues for invalid input and limits', () => {
      expect(parsePdfWatermarkPageRange('1,,3', 6)).toEqual({
        issue: '頁碼格式不正確，請使用例如 1-3, 5 的格式。',
        ok: false,
        pages: [],
      })
      expect(parsePdfWatermarkPageRange('7', 6)).toEqual({
        issue: '頁碼必須介於 1 與 6 之間。',
        ok: false,
        pages: [],
      })
      expect(parsePdfWatermarkPageRange('1-4', 6, 3)).toEqual({
        issue: '單次最多處理 3 頁，請縮小頁碼範圍。',
        ok: false,
        pages: [],
      })
      expect(parsePdfWatermarkPageRange('1', 0)).toEqual({
        issue: 'PDF 頁數必須是大於 0 的整數。',
        ok: false,
        pages: [],
      })
      expect(parsePdfWatermarkPageRange('1', 6, 0)).toEqual({
        issue: '頁數上限必須是大於 0 的整數。',
        ok: false,
        pages: [],
      })
    })
  })

  describe('createPdfWatermarkFilename', () => {
    it('keeps Unicode while removing unsafe characters and repeated PDF extensions', () => {
      expect(createPdfWatermarkFilename('年度報表<最終>.PDF.pdf')).toBe(
        '年度報表-最終-watermarked.pdf',
      )
      expect(createPdfWatermarkFilename('.pdf')).toBe('pdf-watermarked.pdf')
    })
  })

  describe('normalizePdfWatermarkOptions', () => {
    it('clamps bounded values, wraps angles, and replaces non-finite values', () => {
      expect(
        normalizePdfWatermarkOptions({
          angle: 540,
          opacity: 2,
          scale: -1,
          spacing: Number.POSITIVE_INFINITY,
        }),
      ).toEqual({
        angle: -180,
        opacity: 1,
        scale: 0.05,
        spacing: 36,
      })

      expect(
        normalizePdfWatermarkOptions({
          angle: Number.NaN,
          opacity: Number.NaN,
          scale: Number.NaN,
          spacing: Number.NaN,
        }),
      ).toEqual({
        angle: -45,
        opacity: 0.25,
        scale: 0.35,
        spacing: 36,
      })
    })
  })

  describe('inspectPdfWatermarkImage', () => {
    it('從檔案內容辨識 PNG／JPEG 格式與尺寸，不信任副檔名或 MIME', () => {
      const pngHeader = Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x03, 0x20, 0x00, 0x00, 0x01, 0x90,
      ])
      const jpegHeader = Uint8Array.from([
        0xff, 0xd8,
        0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
        0xff, 0xc0, 0x00, 0x0b, 0x08, 0x01, 0x90, 0x03, 0x20, 0x01, 0x01, 0x11, 0x00,
        0xff, 0xd9,
      ])

      expect(inspectPdfWatermarkImage(pngHeader)).toEqual({
        format: 'png',
        height: 400,
        ok: true,
        width: 800,
      })
      expect(inspectPdfWatermarkImage(jpegHeader)).toEqual({
        format: 'jpeg',
        height: 400,
        ok: true,
        width: 800,
      })
      expect(inspectPdfWatermarkImage(Uint8Array.from([0x47, 0x49, 0x46]))).toEqual({
        issue: '浮水印圖片必須是有效的 PNG 或 JPEG。',
        ok: false,
      })
    })
  })

  describe('hasPdfDigitalSignatureMarker', () => {
    it.each([
      '%PDF-1.7\n12 0 obj << /ByteRange [0 100 200 300] >>',
      '%PDF-1.7\n/TransformMethod /DocMDP',
    ])('保守辨識原始 PDF 中的簽章標記', (source) => {
      expect(hasPdfDigitalSignatureMarker(new TextEncoder().encode(source))).toBe(true)
    })

    it('不把相似但不同的 PDF name 當成簽章標記', () => {
      const bytes = new TextEncoder().encode(
        '%PDF-1.7\n/ByteRangeBackup /DocMDPReference',
      )

      expect(hasPdfDigitalSignatureMarker(bytes)).toBe(false)
    })

    it('處理 slash 密集的 PDF 內容', () => {
      const bytes = new TextEncoder().encode(
        `${'/'.repeat(100_000)}/ByteRange [0 1 2 3]`,
      )

      expect(hasPdfDigitalSignatureMarker(bytes)).toBe(true)
    })
  })

  describe('createPdfWatermarkPlacements', () => {
    it.each([
      [0, { rotation: 0, x: 210, y: 370 }],
      [90, { rotation: 90, x: 360, y: 320 }],
      [180, { rotation: 180, x: 410, y: 470 }],
      [270, { rotation: 270, x: 260, y: 520 }],
    ] as const)(
      'centers a watermark inside a non-zero CropBox at %i degrees',
      (pageRotation, expectedAnchor) => {
        expect(
          createPdfWatermarkPlacements({
            cropBox: { height: 800, width: 600, x: 10, y: 20 },
            layout: 'center',
            pageRotation,
            watermarkSize: { height: 100, width: 200 },
          }),
        ).toEqual({
          ok: true,
          placements: [
            {
              height: 100,
              width: 200,
              ...expectedAnchor,
            },
          ],
        })
      },
    )

    it('keeps the requested visible angle centered after page rotation', () => {
      const result = createPdfWatermarkPlacements({
        angle: 45,
        cropBox: { height: 800, width: 600, x: 10, y: 20 },
        layout: 'center',
        pageRotation: 90,
        watermarkSize: { height: 100, width: 200 },
      })

      expect(result.ok).toBe(true)
      if (!result.ok) {
        throw new Error(result.issue)
      }

      expect(result.placements).toHaveLength(1)
      expect(result.placements[0]).toMatchObject({
        height: 100,
        rotation: 135,
        width: 200,
      })
      expect(result.placements[0]?.x).toBeCloseTo(416.066, 3)
      expect(result.placements[0]?.y).toBeCloseTo(384.645, 3)
    })

    it('returns a friendly issue before a tile layout exceeds its placement limit', () => {
      expect(
        createPdfWatermarkPlacements({
          cropBox: { height: 1_000, width: 1_000, x: 0, y: 0 },
          horizontalSpacing: 0,
          layout: 'tile',
          maxPlacements: 50,
          pageRotation: 0,
          verticalSpacing: 0,
          watermarkSize: { height: 1, width: 1 },
        }),
      ).toEqual({
        issue: '平鋪浮水印數量超過安全上限（最多 50 個），請加大浮水印或間距。',
        ok: false,
        placements: [],
      })
    })

    it('tiles symmetrically in visible page coordinates before mapping to PDF coordinates', () => {
      const result = createPdfWatermarkPlacements({
        cropBox: { height: 300, width: 200, x: 10, y: 20 },
        horizontalSpacing: 50,
        layout: 'tile',
        pageRotation: 90,
        verticalSpacing: 50,
        watermarkSize: { height: 50, width: 100 },
      })

      expect(result.ok).toBe(true)
      if (!result.ok) {
        throw new Error(result.issue)
      }

      expect(result.placements).toHaveLength(9)
      expect(result.placements[0]).toEqual({
        height: 50,
        rotation: 90,
        width: 100,
        x: 235,
        y: -30,
      })
      expect(result.placements.at(-1)).toEqual({
        height: 50,
        rotation: 90,
        width: 100,
        x: 35,
        y: 270,
      })
    })

    it('rejects invalid dimensions and unsupported page rotations', () => {
      expect(
        createPdfWatermarkPlacements({
          cropBox: { height: 800, width: Number.NaN, x: 0, y: 0 },
          layout: 'center',
          pageRotation: 0,
          watermarkSize: { height: 100, width: 200 },
        }),
      ).toEqual({
        issue: '頁面與浮水印尺寸必須是大於 0 的有限數值。',
        ok: false,
        placements: [],
      })

      expect(
        createPdfWatermarkPlacements({
          cropBox: { height: 800, width: 600, x: 0, y: 0 },
          layout: 'center',
          pageRotation: 45 as 0,
          watermarkSize: { height: 100, width: 200 },
        }),
      ).toEqual({
        issue: '頁面旋轉角度必須是 0、90、180 或 270 度。',
        ok: false,
        placements: [],
      })
    })
  })
})
