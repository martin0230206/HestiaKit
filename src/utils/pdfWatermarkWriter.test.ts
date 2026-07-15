import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFString,
  StandardFonts,
  decodePDFRawStream,
  degrees,
} from '@pdfme/pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'
import { createPdfWatermarkPlacements } from './pdfWatermark'
import {
  PdfWatermarkWriterError,
  addPdfWatermark,
  mapPdfWatermarkWriterError,
  type PdfWatermarkWriterProgress,
} from './pdfWatermarkWriter'

const ONE_PIXEL_PNG = Uint8Array.from(
  decodeBase64(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  ),
)

const ONE_PIXEL_JPEG = Uint8Array.from(
  decodeBase64(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==',
  ),
)

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function createPdfFixture(): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.addPage([300, 500])
  const rotatedPage = document.addPage([640, 360])
  rotatedPage.setRotation(degrees(90))
  document.addPage([612, 792])
  return document.save({ useObjectStreams: false })
}

async function createManyPagePdfFixture(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    document.addPage([300, 500])
  }
  return document.save({ useObjectStreams: false })
}

async function createEncryptedPdfFixture(): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.addPage([300, 500])
  document.context.trailerInfo.Encrypt = document.context.register(
    document.context.obj({ Filter: 'Standard' }),
  )
  return document.save({ useObjectStreams: false })
}

async function createRotatedCropBoxFixture(): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  for (const rotation of [90, 180, 270]) {
    const page = document.addPage([500, 700])
    page.setCropBox(40, 60, 300, 400)
    page.setRotation(degrees(rotation))
  }
  return document.save({ useObjectStreams: false })
}

async function createPreservationFixture(): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  const page = document.addPage([612, 792])
  const font = await document.embedFont(StandardFonts.Helvetica)
  page.drawText('Original searchable text', {
    font,
    size: 18,
    x: 40,
    y: 700,
  })

  const form = document.getForm()
  const customerName = form.createTextField('customer.name')
  customerName.setText('Alice')
  customerName.addToPage(page, {
    font,
    height: 24,
    width: 180,
    x: 40,
    y: 640,
  })

  const note = document.context.register(
    document.context.obj({
      Contents: PDFString.of('Keep this note'),
      Rect: [40, 580, 64, 604],
      Subtype: 'Text',
      Type: 'Annot',
    }),
  )
  page.node.addAnnot(note)

  const link = document.context.register(
    document.context.obj({
      A: {
        S: 'URI',
        Type: 'Action',
        URI: PDFString.of('https://example.com/preserved'),
      },
      Border: [0, 0, 0],
      Rect: [40, 520, 220, 548],
      Subtype: 'Link',
      Type: 'Annot',
    }),
  )
  page.node.addAnnot(link)

  await document.attach(
    new TextEncoder().encode('preserved attachment'),
    'evidence.txt',
    { description: 'Evidence', mimeType: 'text/plain' },
  )

  return document.save({ useObjectStreams: false })
}

function countContentStreams(document: PDFDocument, pageIndex: number): number {
  const contents = document.getPage(pageIndex).node.Contents()
  if (!contents) return 0
  return contents instanceof PDFArray ? contents.size() : 1
}

function getReferencedImageObjects(document: PDFDocument): Set<string> {
  const references = new Set<string>()

  for (const page of document.getPages()) {
    const resourceObject = page.node.Resources()?.get(PDFName.of('XObject'))
    if (!resourceObject) continue

    const resources = document.context.lookup(resourceObject, PDFDict)
    for (const [, reference] of resources.entries()) {
      references.add(reference.toString())
    }
  }

  return references
}

function getDecodedPageContent(document: PDFDocument, pageIndex: number): string {
  const contents = document.getPage(pageIndex).node.Contents()
  if (!contents) return ''

  const streams =
    contents instanceof PDFArray
      ? Array.from({ length: contents.size() }, (_, index) =>
          contents.lookup(index, PDFRawStream),
        )
      : [document.context.lookup(contents)].map((stream) => {
          if (!(stream instanceof PDFRawStream)) {
            throw new Error('Expected a raw PDF content stream')
          }
          return stream
        })

  return streams
    .map((stream) =>
      new TextDecoder().decode(decodePDFRawStream(stream).decode()),
    )
    .join('\n')
}

function getTranslationMatrices(content: string): Array<{ x: number; y: number }> {
  const number = '([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))'
  const matcher = new RegExp(`1 0 0 1 ${number} ${number} cm`, 'g')

  return [...content.matchAll(matcher)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }))
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const loadingTask = getDocument({
    data: bytes.slice(),
    standardFontDataUrl: new URL(
      '../../node_modules/pdfjs-dist/standard_fonts/',
      import.meta.url,
    ).href,
  })
  const document = await loadingTask.promise

  try {
    const page = await document.getPage(1)
    const content = await page.getTextContent()
    return content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
  } finally {
    await loadingTask.destroy()
  }
}

describe('addPdfWatermark', () => {
  it('returns a PDF that preserves page geometry and changes only selected pages', async () => {
    const inputBytes = await createPdfFixture()
    const progress: PdfWatermarkWriterProgress[] = []

    const outputBytes = await addPdfWatermark(
      {
        pdfBytes: inputBytes,
        watermarkBytes: ONE_PIXEL_PNG,
        watermarkFormat: 'png',
        selectedPages: [2],
        options: {
          layout: 'center',
          opacity: 0.35,
          rotation: -45,
          widthRatio: 0.5,
        },
      },
      (event) => progress.push(event),
    )

    expect(outputBytes.subarray(0, 5)).toEqual(
      Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
    )

    const outputDocument = await PDFDocument.load(outputBytes)
    expect(outputDocument.getPageCount()).toBe(3)
    expect(outputDocument.getPages().map((page) => page.getSize())).toEqual([
      { height: 500, width: 300 },
      { height: 360, width: 640 },
      { height: 792, width: 612 },
    ])
    expect(outputDocument.getPages().map((page) => page.getRotation().angle)).toEqual([
      0,
      90,
      0,
    ])
    expect(
      [0, 1, 2].map((pageIndex) => countContentStreams(outputDocument, pageIndex)),
    ).toEqual([0, 1, 0])
    expect(progress).toEqual([
      { completedPages: 1, pageNumber: 2, percent: 100, totalPages: 1 },
    ])
  })

  it('embeds one image object and reuses it across selected pages', async () => {
    const progress: PdfWatermarkWriterProgress[] = []
    const outputBytes = await addPdfWatermark(
      {
        pdfBytes: await createPdfFixture(),
        watermarkBytes: ONE_PIXEL_PNG,
        watermarkFormat: 'png',
        selectedPages: [1, 3],
        options: {
          layout: 'center',
          opacity: 0.5,
          rotation: 0,
          widthRatio: 0.4,
        },
      },
      (event) => progress.push(event),
    )

    const outputDocument = await PDFDocument.load(outputBytes)
    expect(getReferencedImageObjects(outputDocument).size).toBe(1)
    expect(
      [0, 1, 2].map((pageIndex) => countContentStreams(outputDocument, pageIndex)),
    ).toEqual([1, 0, 1])
    expect(progress).toEqual([
      { completedPages: 1, pageNumber: 1, percent: 50, totalPages: 2 },
      { completedPages: 2, pageNumber: 3, percent: 100, totalPages: 2 },
    ])
  })

  it('accepts a JPEG watermark and still returns a parseable PDF', async () => {
    const outputBytes = await addPdfWatermark({
      pdfBytes: await createPdfFixture(),
      watermarkBytes: ONE_PIXEL_JPEG,
      watermarkFormat: 'jpeg',
      selectedPages: [1],
      options: {
        layout: 'center',
        opacity: 0.5,
        rotation: 0,
        widthRatio: 0.4,
      },
    })

    const outputDocument = await PDFDocument.load(outputBytes)
    expect(outputDocument.getPageCount()).toBe(3)
    expect(countContentStreams(outputDocument, 0)).toBe(1)
  })

  it('writes tile placements through non-zero CropBoxes at 90, 180, and 270 degrees', async () => {
    const outputBytes = await addPdfWatermark({
      pdfBytes: await createRotatedCropBoxFixture(),
      watermarkBytes: ONE_PIXEL_PNG,
      watermarkFormat: 'png',
      selectedPages: [1, 2, 3],
      options: {
        horizontalSpacingRatio: 0.1,
        layout: 'tile',
        opacity: 0.4,
        rotation: -30,
        verticalSpacingRatio: 0.2,
        widthRatio: 0.2,
      },
    })

    const outputDocument = await PDFDocument.load(outputBytes)
    const rotations = [90, 180, 270] as const

    for (const [pageIndex, pageRotation] of rotations.entries()) {
      const page = outputDocument.getPage(pageIndex)
      const cropBox = page.getCropBox()
      expect(cropBox).toEqual({ height: 400, width: 300, x: 40, y: 60 })
      expect(page.getRotation().angle).toBe(pageRotation)

      const visualWidth = pageRotation === 90 || pageRotation === 270 ? 400 : 300
      const visualHeight = pageRotation === 90 || pageRotation === 270 ? 300 : 400
      const watermarkWidth = visualWidth * 0.2
      const placementResult = createPdfWatermarkPlacements({
        angle: -30,
        cropBox,
        horizontalSpacing: visualWidth * 0.1,
        layout: 'tile',
        pageRotation,
        verticalSpacing: visualHeight * 0.2,
        watermarkSize: { height: watermarkWidth, width: watermarkWidth },
      })
      expect(placementResult.ok).toBe(true)
      if (!placementResult.ok) continue

      const content = getDecodedPageContent(outputDocument, pageIndex)
      const imageDrawCount = content.match(/\bDo\b/g)?.length ?? 0
      const translations = getTranslationMatrices(content)
      expect(imageDrawCount).toBe(placementResult.placements.length)
      expect(imageDrawCount).toBeGreaterThan(1)
      for (const placement of placementResult.placements) {
        expect(
          translations.some(
            ({ x, y }) =>
              Math.abs(x - placement.x) < 0.001 &&
              Math.abs(y - placement.y) < 0.001,
          ),
        ).toBe(true)
      }
    }
  })

  it('preserves searchable text, forms, annotations, links, and attachments', async () => {
    const outputBytes = await addPdfWatermark({
      pdfBytes: await createPreservationFixture(),
      watermarkBytes: ONE_PIXEL_PNG,
      watermarkFormat: 'png',
      selectedPages: [1],
      options: {
        layout: 'center',
        opacity: 0.3,
        rotation: -45,
        widthRatio: 0.4,
      },
    })

    expect(await extractPdfText(outputBytes)).toContain('Original searchable text')

    const outputDocument = await PDFDocument.load(outputBytes)
    expect(outputDocument.getForm().getTextField('customer.name').getText()).toBe(
      'Alice',
    )

    const annotations = outputDocument.getPage(0).node.Annots()
    expect(annotations).toBeDefined()
    const annotationDictionaries = Array.from(
      { length: annotations?.size() ?? 0 },
      (_, index) => annotations!.lookup(index, PDFDict),
    )
    const note = annotationDictionaries.find(
      (annotation) => annotation.get(PDFName.of('Subtype'))?.toString() === '/Text',
    )
    expect(note?.lookup(PDFName.of('Contents'), PDFString).decodeText()).toBe(
      'Keep this note',
    )
    const link = annotationDictionaries.find(
      (annotation) => annotation.get(PDFName.of('Subtype'))?.toString() === '/Link',
    )
    const action = link?.lookup(PDFName.of('A'), PDFDict)
    expect(action?.lookup(PDFName.of('URI'), PDFString).decodeText()).toBe(
      'https://example.com/preserved',
    )

    const names = outputDocument.catalog.lookup(PDFName.of('Names'), PDFDict)
    const embeddedFiles = names.lookup(PDFName.of('EmbeddedFiles'), PDFDict)
    const attachmentNames = embeddedFiles.lookup(PDFName.of('Names'), PDFArray)
    expect(
      attachmentNames.lookup(0, PDFString, PDFHexString).decodeText(),
    ).toBe('evidence.txt')
    const fileSpecification = attachmentNames.lookup(1, PDFDict)
    const embeddedFileDictionary = fileSpecification.lookup(
      PDFName.of('EF'),
      PDFDict,
    )
    const embeddedFile = outputDocument.context.lookup(
      embeddedFileDictionary.get(PDFName.of('F')),
    )
    expect(embeddedFile).toBeInstanceOf(PDFRawStream)
    if (!(embeddedFile instanceof PDFRawStream)) return
    expect(
      new TextDecoder().decode(decodePDFRawStream(embeddedFile).decode()),
    ).toBe('preserved attachment')
  })

  it('rejects encrypted PDFs instead of silently removing protection', async () => {
    await expect(
      addPdfWatermark({
        pdfBytes: await createEncryptedPdfFixture(),
        watermarkBytes: ONE_PIXEL_PNG,
        watermarkFormat: 'png',
        selectedPages: [1],
        options: {
          layout: 'center',
          opacity: 0.5,
          rotation: 0,
          widthRatio: 0.4,
        },
      }),
    ).rejects.toMatchObject({ code: 'ENCRYPTED_PDF' })
  })

  it('maps corrupt PDF input to a stable error code', async () => {
    await expect(
      addPdfWatermark({
        pdfBytes: new TextEncoder().encode('%PDF-1.7\nthis is not a PDF'),
        watermarkBytes: ONE_PIXEL_PNG,
        watermarkFormat: 'png',
        selectedPages: [1],
        options: {
          layout: 'center',
          opacity: 0.5,
          rotation: 0,
          widthRatio: 0.4,
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PDF' })
  })

  it('maps malformed watermark bytes to a stable image error', async () => {
    await expect(
      addPdfWatermark({
        pdfBytes: await createPdfFixture(),
        watermarkBytes: new TextEncoder().encode('not an image'),
        watermarkFormat: 'png',
        selectedPages: [1],
        options: {
          layout: 'center',
          opacity: 0.5,
          rotation: 0,
          widthRatio: 0.4,
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE' })
  })

  it('rejects invalid page selections with a stable error code', async () => {
    await expect(
      addPdfWatermark({
        pdfBytes: await createPdfFixture(),
        watermarkBytes: ONE_PIXEL_PNG,
        watermarkFormat: 'png',
        selectedPages: [0, 4],
        options: {
          layout: 'center',
          opacity: 0.5,
          rotation: 0,
          widthRatio: 0.4,
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PAGE_SELECTION' })
  })

  it('rejects an excessive aggregate tile count before drawing or reporting progress', async () => {
    const selectedPages = Array.from({ length: 15 }, (_, index) => index + 1)
    const progress: PdfWatermarkWriterProgress[] = []

    await expect(
      addPdfWatermark(
        {
          pdfBytes: await createManyPagePdfFixture(selectedPages.length),
          watermarkBytes: ONE_PIXEL_PNG,
          watermarkFormat: 'png',
          selectedPages,
          options: {
            horizontalSpacingRatio: 0,
            layout: 'tile',
            opacity: 0.5,
            rotation: 0,
            verticalSpacingRatio: 0,
            widthRatio: 0.05,
          },
        },
        (event) => progress.push(event),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_OPTIONS',
      message: expect.stringContaining('10,000'),
    })
    expect(progress).toEqual([])
  })
})

describe('mapPdfWatermarkWriterError', () => {
  it.each([
    ['DecompressionBombError', 'Decoded stream is too large', 'DECOMPRESSION_BOMB'],
    ['EncryptedPDFError', 'File is encrypted', 'ENCRYPTED_PDF'],
    ['Error', 'NEEDS PASSWORD', 'ENCRYPTED_PDF'],
    ['MissingPDFHeaderError', 'No PDF header found', 'INVALID_PDF'],
  ] as const)('maps %s to %s', (name, message, expectedCode) => {
    const cause = new Error(message)
    cause.name = name

    expect(mapPdfWatermarkWriterError(cause)).toMatchObject({ code: expectedCode })
  })

  it('keeps an existing writer error unchanged', () => {
    const error = new PdfWatermarkWriterError(
      'INVALID_IMAGE',
      '浮水印圖片無法解析。',
    )
    expect(mapPdfWatermarkWriterError(error)).toBe(error)
  })
})
