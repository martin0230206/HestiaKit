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
})
