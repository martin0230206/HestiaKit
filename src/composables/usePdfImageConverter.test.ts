// @vitest-environment jsdom

import { effectScope } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePdfImageConverter } from './usePdfImageConverter'

const pdfMocks = vi.hoisted(() => {
  class PasswordException extends Error {
    code = 1
  }

  class InvalidPDFException extends Error {}

  const destroy = vi.fn(async () => undefined)
  const pageCleanup = vi.fn()
  const renderCancel = vi.fn()
  const renderPage = vi.fn()
  const getPage = vi.fn()
  const getDocument = vi.fn()

  return {
    destroy,
    getDocument,
    getPage,
    InvalidPDFException,
    pageCleanup,
    PasswordException,
    renderCancel,
    renderPage,
  }
})

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: '/assets/pdf.worker.min.mjs',
}))

vi.mock('pdfjs-dist', () => ({
  getDocument: pdfMocks.getDocument,
  GlobalWorkerOptions: { workerSrc: '' },
  InvalidPDFException: pdfMocks.InvalidPDFException,
  PasswordException: pdfMocks.PasswordException,
  PasswordResponses: { INCORRECT_PASSWORD: 2, NEED_PASSWORD: 1 },
}))

describe('usePdfImageConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    let rejectRender: (reason?: unknown) => void = () => undefined
    const renderPromise = new Promise<void>((_, reject) => {
      rejectRender = reject
    })
    pdfMocks.renderCancel.mockImplementation(() => {
      rejectRender(new Error('render cancelled'))
    })
    pdfMocks.renderPage.mockReturnValue({
      cancel: pdfMocks.renderCancel,
      promise: renderPromise,
    })

    const page = {
      cleanup: pdfMocks.pageCleanup,
      getViewport: ({ scale }: { scale: number }) => ({
        height: 792 * scale,
        width: 612 * scale,
      }),
      render: pdfMocks.renderPage,
    }
    pdfMocks.getPage.mockResolvedValue(page)
    pdfMocks.getDocument.mockReturnValue({
      destroy: pdfMocks.destroy,
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getPage: pdfMocks.getPage,
        numPages: 1,
      }),
    })
  })

  it('cancels the active render, releases the PDF task, and clears the password', async () => {
    const scope = effectScope()
    const converter = scope.run(() => usePdfImageConverter())
    expect(converter).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(4)),
      name: 'protected.pdf',
      size: 4,
      type: 'application/pdf',
    } as unknown as File

    await converter?.selectFile(file)
    if (!converter) {
      return
    }

    converter.password.value = 'secret'
    const conversion = converter.convert()
    await vi.waitFor(() => expect(pdfMocks.renderPage).toHaveBeenCalledOnce())

    converter.cancelConversion()
    await conversion

    expect(converter.conversionState.value).toBe('cancelled')
    expect(converter.password.value).toBe('')
    expect(pdfMocks.renderCancel).toHaveBeenCalledOnce()
    expect(pdfMocks.destroy).toHaveBeenCalledOnce()
    scope.stop()
  })

  it('renders a conversion above the safe scale only after the user continues', async () => {
    const pageSizes = [
      { width: 4_572, height: 2_340 },
      { width: 3_807, height: 2_268 },
      { width: 5_328, height: 2_916 },
      { width: 3_807, height: 2_268 },
      { width: 5_328, height: 2_916 },
    ]
    pdfMocks.getPage.mockImplementation(async (pageNumber: number) => ({
      cleanup: pdfMocks.pageCleanup,
      getViewport: ({ scale }: { scale: number }) => ({
        height: pageSizes[pageNumber - 1].height * scale,
        width: pageSizes[pageNumber - 1].width * scale,
      }),
      render: pdfMocks.renderPage,
    }))
    pdfMocks.getDocument.mockReturnValue({
      destroy: pdfMocks.destroy,
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getPage: pdfMocks.getPage,
        numPages: 5,
      }),
    })

    const scope = effectScope()
    const converter = scope.run(() => usePdfImageConverter())
    expect(converter).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(4)),
      name: 'enterprise-scale-architecture.pdf',
      size: 4,
      type: 'application/pdf',
    } as unknown as File

    await converter?.selectFile(file)
    if (!converter) {
      return
    }

    converter.dpi.value = '96'
    await converter.convert()

    expect(converter.isRiskConfirmationOpen.value).toBe(true)
    expect(converter.conversionEstimate.value).toMatchObject({
      dpi: 96,
      pageCount: 5,
      suggestedBatchPages: [1, 2, 3, 4],
      totalPixels: 104_959_872,
    })
    expect(pdfMocks.renderPage).not.toHaveBeenCalled()

    const conversion = converter.continueLargeConversion()
    await vi.waitFor(() => expect(pdfMocks.renderPage).toHaveBeenCalledOnce())

    expect(converter.isRiskConfirmationOpen.value).toBe(false)
    expect(converter.conversionState.value).toBe('converting')

    converter.cancelConversion()
    await conversion
    scope.stop()
  })

  it('applies the suggested batch for a page count above the safe batch size', async () => {
    const page = {
      cleanup: pdfMocks.pageCleanup,
      getViewport: ({ scale }: { scale: number }) => ({
        height: 792 * scale,
        width: 612 * scale,
      }),
      render: pdfMocks.renderPage,
    }
    pdfMocks.getPage.mockResolvedValue(page)
    pdfMocks.getDocument.mockReturnValue({
      destroy: pdfMocks.destroy,
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getPage: pdfMocks.getPage,
        numPages: 24,
      }),
    })

    const scope = effectScope()
    const converter = scope.run(() => usePdfImageConverter())
    expect(converter).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(4)),
      name: '24-pages.pdf',
      size: 4,
      type: 'application/pdf',
    } as unknown as File

    await converter?.selectFile(file)
    if (!converter) {
      return
    }

    converter.dpi.value = '96'

    expect(converter.canConvert.value).toBe(true)
    await converter.convert()
    expect(converter.conversionEstimate.value).toMatchObject({
      exceedsPageCount: true,
      pageCount: 24,
      suggestedBatchPages: Array.from({ length: 20 }, (_, index) => index + 1),
    })
    expect(converter.isRiskConfirmationOpen.value).toBe(true)

    converter.splitLargeConversion()

    expect(converter.pageSelectionMode.value).toBe('range')
    expect(converter.pageRange.value).toBe('1-20')
    expect(converter.isRiskConfirmationOpen.value).toBe(false)
    scope.stop()
  })

  it('lowers the DPI without starting a risky conversion', async () => {
    const page = {
      cleanup: pdfMocks.pageCleanup,
      getViewport: ({ scale }: { scale: number }) => ({
        height: 2_000 * scale,
        width: 2_000 * scale,
      }),
      render: pdfMocks.renderPage,
    }
    pdfMocks.getPage.mockResolvedValue(page)

    const scope = effectScope()
    const converter = scope.run(() => usePdfImageConverter())
    expect(converter).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(4)),
      name: 'large-page.pdf',
      size: 4,
      type: 'application/pdf',
    } as unknown as File

    await converter?.selectFile(file)
    if (!converter) {
      return
    }

    converter.dpi.value = '300'
    await converter.convert()
    expect(converter.conversionEstimate.value?.exceedsSinglePagePixels).toBe(true)

    converter.reduceConversionDpi()

    expect(converter.dpi.value).toBe('150')
    expect(converter.isRiskConfirmationOpen.value).toBe(false)
    expect(pdfMocks.renderPage).not.toHaveBeenCalled()
    scope.stop()
  })

  it('keeps completed images when a later page fails', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:completed-page'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(new Blob(['page image'], { type: 'image/png' })))
    pdfMocks.renderPage
      .mockReturnValueOnce({
        cancel: pdfMocks.renderCancel,
        promise: Promise.resolve(),
      })
      .mockReturnValueOnce({
        cancel: pdfMocks.renderCancel,
        promise: Promise.reject(new Error('第 2 頁渲染失敗。')),
      })
    pdfMocks.getDocument.mockReturnValue({
      destroy: pdfMocks.destroy,
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getPage: pdfMocks.getPage,
        numPages: 2,
      }),
    })

    const scope = effectScope()
    const converter = scope.run(() => usePdfImageConverter())
    expect(converter).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(4)),
      name: 'two-pages.pdf',
      size: 4,
      type: 'application/pdf',
    } as unknown as File

    await converter?.selectFile(file)
    if (!converter) {
      return
    }

    converter.dpi.value = '96'
    await converter.convert()

    expect(converter.conversionState.value).toBe('failed')
    expect(converter.conversionMessage.value).toBe('第 2 頁渲染失敗。')
    expect(converter.results.value).toHaveLength(1)
    expect(converter.results.value[0].pageNumber).toBe(1)
    toBlob.mockRestore()
    scope.stop()
  })

  it('prevents another conversion while estimating the selected pages', async () => {
    let resolvePage: (page: unknown) => void = () => undefined
    const pendingPage = new Promise((resolve) => {
      resolvePage = resolve
    })
    const page = {
      cleanup: pdfMocks.pageCleanup,
      getViewport: ({ scale }: { scale: number }) => ({
        height: 792 * scale,
        width: 612 * scale,
      }),
      render: pdfMocks.renderPage,
    }
    pdfMocks.getPage.mockReturnValueOnce(pendingPage)

    const scope = effectScope()
    const converter = scope.run(() => usePdfImageConverter())
    expect(converter).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(4)),
      name: 'one-page.pdf',
      size: 4,
      type: 'application/pdf',
    } as unknown as File

    await converter?.selectFile(file)
    if (!converter) {
      return
    }

    const conversion = converter.convert()
    await vi.waitFor(() => expect(pdfMocks.getPage).toHaveBeenCalledOnce())

    expect(converter.isPreparingConversion.value).toBe(true)
    expect(converter.canConvert.value).toBe(false)

    resolvePage(page)
    await vi.waitFor(() => expect(pdfMocks.renderPage).toHaveBeenCalledOnce())
    expect(converter.isPreparingConversion.value).toBe(false)

    converter.cancelConversion()
    await conversion
    scope.stop()
  })
})
