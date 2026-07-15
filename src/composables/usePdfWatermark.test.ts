// @vitest-environment jsdom

import { effectScope, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePdfWatermark } from './usePdfWatermark'

const pdfMocks = vi.hoisted(() => {
  class PasswordException extends Error {
    code = 1
  }

  class InvalidPDFException extends Error {}

  return {
    getDocument: vi.fn(),
    getPage: vi.fn(),
    InvalidPDFException,
    PasswordException,
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

class MockWorker {
  static instances: MockWorker[] = []

  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor() {
    MockWorker.instances.push(this)
  }

  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent)
  }
}

function createPngHeader(width: number, height: number): ArrayBuffer {
  const bytes = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
  ])
  return bytes.slice().buffer
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

describe('usePdfWatermark', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ close: vi.fn(), height: 400, width: 800 })),
    )

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:pdf-watermark'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillText: vi.fn(),
      font: '',
      measureText: vi.fn(() => ({
        actualBoundingBoxAscent: 64,
        actualBoundingBoxDescent: 16,
        width: 320,
      })),
      textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['png'], { type: 'image/png' }))
    })

    pdfMocks.getPage.mockImplementation(async () => ({
      cleanup: vi.fn(),
      getViewport: ({ scale }: { scale: number }) => ({
        height: 792 * scale,
        width: 612 * scale,
      }),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
    }))
    pdfMocks.getDocument.mockReturnValue({
      destroy: vi.fn(async () => undefined),
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        destroy: vi.fn(async () => undefined),
        getFieldObjects: vi.fn(async () => null),
        getPage: pdfMocks.getPage,
        numPages: 2,
      }),
    })
  })

  it('重新開啟工具時恢復上次使用的文字浮水印設定', async () => {
    const firstScope = effectScope()
    const firstWatermark = firstScope.run(() => usePdfWatermark())

    expect(firstWatermark).toBeDefined()
    if (!firstWatermark) return

    firstWatermark.watermarkText.value = '內部使用'
    firstWatermark.watermarkColor.value = '#371dB9'
    firstWatermark.layout.value = 'tile'
    firstWatermark.opacityPercent.value = 27
    firstWatermark.sizePercent.value = 69
    firstWatermark.rotation.value = 30
    await nextTick()
    firstScope.stop()

    const secondScope = effectScope()
    const restoredWatermark = secondScope.run(() => usePdfWatermark())

    expect(restoredWatermark?.watermarkText.value).toBe('內部使用')
    expect(restoredWatermark?.watermarkColor.value).toBe('#371dB9')
    expect(restoredWatermark?.layout.value).toBe('tile')
    expect(restoredWatermark?.opacityPercent.value).toBe(27)
    expect(restoredWatermark?.sizePercent.value).toBe(69)
    expect(restoredWatermark?.rotation.value).toBe(30)

    secondScope.stop()
  })

  it('重置浮水印設定並在下次開啟時維持預設值', async () => {
    const firstScope = effectScope()
    const watermark = firstScope.run(() => usePdfWatermark())

    expect(watermark).toBeDefined()
    if (!watermark) return

    watermark.watermarkText.value = '內部使用'
    watermark.watermarkColor.value = '#371db9'
    watermark.layout.value = 'tile'
    watermark.opacityPercent.value = 80
    watermark.sizePercent.value = 70
    watermark.rotation.value = 90
    await nextTick()

    watermark.resetSettings()
    await nextTick()

    expect(watermark.watermarkText.value).toBe('機密文件')
    expect(watermark.watermarkColor.value).toBe('#b42318')
    expect(watermark.layout.value).toBe('center')
    expect(watermark.opacityPercent.value).toBe(25)
    expect(watermark.sizePercent.value).toBe(45)
    expect(watermark.rotation.value).toBe(-45)
    firstScope.stop()

    const secondScope = effectScope()
    const restoredWatermark = secondScope.run(() => usePdfWatermark())

    expect(restoredWatermark?.watermarkText.value).toBe('機密文件')
    expect(restoredWatermark?.watermarkColor.value).toBe('#b42318')
    expect(restoredWatermark?.layout.value).toBe('center')
    expect(restoredWatermark?.opacityPercent.value).toBe(25)
    expect(restoredWatermark?.sizePercent.value).toBe(45)
    expect(restoredWatermark?.rotation.value).toBe(-45)

    secondScope.stop()
  })

  it('產生後提供仍為 PDF 的下載結果', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    expect(watermark).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    expect(watermark?.documentState.value).toBe('ready')

    const generation = watermark?.generate()
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1))
    const worker = MockWorker.instances[0]
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    const request = worker.postMessage.mock.calls[0][0]
    worker.emit({
      type: 'success',
      jobId: request.jobId,
      pdfBuffer: new Uint8Array([37, 80, 68, 70]).buffer,
    })
    await generation

    expect(watermark?.result.value?.filename).toBe('年度報告-watermarked.pdf')
    expect(watermark?.result.value?.blob.type).toBe('application/pdf')
    expect(watermark?.generationState.value).toBe('completed')

    scope.stop()
  })

  it('取消產生後終止 Worker 並忽略過期結果', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    expect(watermark).toBeDefined()

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    const generation = watermark?.generate()
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1))
    const worker = MockWorker.instances[0]
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    const request = worker.postMessage.mock.calls[0][0]

    watermark?.cancelGeneration()
    worker.emit({
      type: 'success',
      jobId: request.jobId,
      pdfBuffer: new Uint8Array([37, 80, 68, 70]).buffer,
    })
    await generation

    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(watermark?.generationState.value).toBe('cancelled')
    expect(watermark?.result.value).toBeNull()

    scope.stop()
  })

  it('在交給 PDF parser 前拒絕非 PDF 檔案', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())

    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '筆記.txt',
      size: 8,
      type: 'text/plain',
    } as unknown as File

    await watermark?.selectFile(file)

    expect(watermark?.documentState.value).toBe('failed')
    expect(watermark?.documentMessage.value).toBe('請選擇 PDF 檔案。')
    expect(watermark?.selectedFile.value).toBeNull()
    expect(pdfMocks.getDocument).not.toHaveBeenCalled()

    scope.stop()
  })

  it('明確拒絕加密 PDF 且不允許產生', async () => {
    const passwordError = new pdfMocks.PasswordException('password required')
    pdfMocks.getDocument.mockReturnValueOnce({
      destroy: vi.fn(async () => undefined),
      promise: Promise.reject(passwordError),
    })
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '受保護.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)

    expect(watermark?.documentState.value).toBe('unsupported-protected')
    expect(watermark?.documentMessage.value).toBe('目前不支援加密或需要密碼的 PDF。')
    expect(watermark?.canGenerate.value).toBe(false)
    expect(MockWorker.instances).toHaveLength(0)

    scope.stop()
  })

  it('驗證自訂頁碼並只把選取頁面交給 Worker', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    watermark!.pageSelectionMode.value = 'range'
    watermark!.pageRange.value = '3'

    expect(watermark?.pageSelectionIssue.value).toBe('頁碼必須介於 1 與 2 之間。')
    expect(watermark?.canGenerate.value).toBe(false)

    watermark!.pageRange.value = '2'
    expect(watermark?.selectedPages.value).toEqual([2])
    expect(watermark?.selectedPageCount.value).toBe(1)

    const generation = watermark?.generate()
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1))
    const worker = MockWorker.instances[0]
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    const request = worker.postMessage.mock.calls[0][0]

    expect(request.input.selectedPages).toEqual([2])

    worker.emit({
      type: 'success',
      jobId: request.jobId,
      pdfBuffer: new Uint8Array([37, 80, 68, 70]).buffer,
    })
    await generation

    scope.stop()
  })

  it('把 Worker 的逐頁進度反映到可存取的產生狀態', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    const generation = watermark?.generate()
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1))
    const worker = MockWorker.instances[0]
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    const request = worker.postMessage.mock.calls[0][0]

    worker.emit({
      type: 'progress',
      jobId: request.jobId,
      progress: {
        completedPages: 1,
        pageNumber: 1,
        percent: 50,
        totalPages: 2,
      },
    })

    expect(watermark?.generationStage.value).toBe('applying')
    expect(watermark?.progressCompleted.value).toBe(1)
    expect(watermark?.progressTotal.value).toBe(2)
    expect(watermark?.progressPercent.value).toBe(50)
    expect(watermark?.generationMessage.value).toBe('正在處理第 1 / 2 頁。')

    worker.emit({
      type: 'success',
      jobId: request.jobId,
      pdfBuffer: new Uint8Array([37, 80, 68, 70]).buffer,
    })
    await generation
    scope.stop()
  })

  it('接受本機 PNG 圖片並以圖片資料產生 PDF 浮水印', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const pdfFile = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File
    const imageFile = {
      arrayBuffer: vi.fn(async () => createPngHeader(800, 400)),
      name: '公司標誌.jpg',
      size: 24,
      type: 'image/jpeg',
    } as unknown as File

    await watermark?.selectFile(pdfFile)
    watermark!.watermarkKind.value = 'image'
    await watermark?.selectWatermarkImage(imageFile)

    expect(watermark?.watermarkImageFile.value).toBe(imageFile)
    expect(watermark?.watermarkImageDimensions.value).toEqual({ height: 400, width: 800 })
    expect(watermark?.canGenerate.value).toBe(true)

    const generation = watermark?.generate()
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1))
    const worker = MockWorker.instances[0]
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    const request = worker.postMessage.mock.calls[0][0]

    expect(request.input.watermarkFormat).toBe('png')
    expect(request.input.watermarkBuffer.byteLength).toBe(24)

    worker.emit({
      type: 'success',
      jobId: request.jobId,
      pdfBuffer: new Uint8Array([37, 80, 68, 70]).buffer,
    })
    await generation

    expect(watermark?.resultIsStale.value).toBe(false)
    watermark?.clearWatermarkImage()
    expect(watermark?.resultIsStale.value).toBe(true)
    scope.stop()
  })

  it('拒絕解碼後像素數超過安全上限的浮水印圖片', async () => {
    vi.mocked(createImageBitmap).mockResolvedValueOnce({
      close: vi.fn(),
      height: 5_000,
      width: 5_000,
    } as unknown as ImageBitmap)
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const imageFile = {
      arrayBuffer: vi.fn(async () => createPngHeader(5_000, 5_000)),
      name: '超大標誌.png',
      size: 24,
      type: 'image/png',
    } as unknown as File

    watermark!.watermarkKind.value = 'image'
    await watermark?.selectWatermarkImage(imageFile)

    expect(watermark?.watermarkImageFile.value).toBeNull()
    expect(watermark?.watermarkImageMessage.value).toBe(
      '浮水印圖片像素過大，最多約 1,677 萬像素。',
    )
    expect(watermark?.canGenerate.value).toBe(false)
    expect(createImageBitmap).not.toHaveBeenCalled()
    scope.stop()
  })

  it('把版面設定轉為 writer 比例並在設定變更後標記結果過期', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    watermark!.layout.value = 'tile'
    watermark!.opacityPercent.value = 30
    watermark!.rotation.value = -30
    watermark!.sizePercent.value = 40
    watermark!.horizontalSpacingPercent.value = 15
    watermark!.verticalSpacingPercent.value = 25

    const generation = watermark?.generate()
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1))
    const worker = MockWorker.instances[0]
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    const request = worker.postMessage.mock.calls[0][0]

    expect(request.input.options).toEqual({
      layout: 'tile',
      horizontalSpacingRatio: 0.15,
      opacity: 0.3,
      rotation: -30,
      verticalSpacingRatio: 0.25,
      widthRatio: 0.4,
    })

    worker.emit({
      type: 'success',
      jobId: request.jobId,
      pdfBuffer: new Uint8Array([37, 80, 68, 70]).buffer,
    })
    await generation

    expect(watermark?.resultIsStale.value).toBe(false)
    watermark!.opacityPercent.value = 45
    expect(watermark?.resultIsStale.value).toBe(true)
    scope.stop()
  })

  it('以 PDF.js 只渲染目前頁並可切換預覽頁面', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)

    expect(pdfMocks.getPage).toHaveBeenCalledWith(1)
    expect(watermark?.previewState.value).toBe('ready')
    expect(watermark?.previewPageNumber.value).toBe(1)
    expect(watermark?.previewBaseUrl.value).toBe('blob:pdf-watermark')
    expect(watermark?.previewAspectRatio.value).toBeCloseTo(612 / 792)

    await watermark?.setPreviewPage(2)

    expect(pdfMocks.getPage).toHaveBeenLastCalledWith(2)
    expect(watermark?.previewPageNumber.value).toBe(2)
    expect(watermark?.previewState.value).toBe('ready')
    scope.stop()
  })

  it('限制極端長頁預覽的單邊尺寸與 Canvas 總像素', async () => {
    let renderedSize = { height: 0, width: 0 }
    const render = vi.fn(({ canvas }: { canvas: HTMLCanvasElement }) => {
      renderedSize = { height: canvas.height, width: canvas.width }
      return { promise: Promise.resolve(), cancel: vi.fn() }
    })
    pdfMocks.getPage.mockResolvedValueOnce({
      cleanup: vi.fn(),
      getViewport: ({ scale }: { scale: number }) => ({
        height: 100_000 * scale,
        width: 100 * scale,
      }),
      render,
    })
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '極長頁面.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)

    expect(renderedSize.width).toBeLessThanOrEqual(1_200)
    expect(renderedSize.height).toBeLessThanOrEqual(1_600)
    expect(renderedSize.width * renderedSize.height).toBeLessThanOrEqual(2_000_000)
    expect(watermark?.previewState.value).toBe('ready')
    scope.stop()
  })

  it('偵測數位簽章欄位以便在輸出前顯示失效警告', async () => {
    pdfMocks.getDocument.mockReturnValueOnce({
      destroy: vi.fn(async () => undefined),
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getFieldObjects: vi.fn(async () => ({
          approval: [{ fieldType: 'Sig', name: 'approval' }],
        })),
        getPage: pdfMocks.getPage,
        numPages: 2,
      }),
    })
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '已簽署合約.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)

    expect(watermark?.hasDigitalSignatures.value).toBe(true)
    expect(watermark?.digitalSignatureState.value).toBe('present')
    scope.stop()
  })

  it('沒有 AcroForm Sig 欄位時把 ByteRange 標成可能有簽章而非確定簽署', async () => {
    const bytes = new TextEncoder().encode(
      '%PDF-1.7\n12 0 obj << /ByteRange [0 100 200 300] >>',
    )
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => bytes.slice().buffer),
      name: '認證文件.pdf',
      size: bytes.byteLength,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)

    expect(watermark?.digitalSignatureState.value).toBe('possible')
    expect(watermark?.hasDigitalSignatures.value).toBe(false)
    scope.stop()
  })

  it('數位簽章掃描完成前禁止產生，掃描失敗則顯示保守狀態', async () => {
    const fieldObjects = createDeferred<null>()
    pdfMocks.getDocument.mockReturnValueOnce({
      destroy: vi.fn(async () => undefined),
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getFieldObjects: vi.fn(() => fieldObjects.promise),
        getPage: pdfMocks.getPage,
        numPages: 2,
      }),
    })
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '掃描中.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    const selection = watermark?.selectFile(file)
    await vi.waitFor(() =>
      expect(watermark?.digitalSignatureState.value).toBe('checking'),
    )
    expect(watermark?.canGenerate.value).toBe(false)

    fieldObjects.reject(new Error('annotation scan failed'))
    await selection

    expect(watermark?.digitalSignatureState.value).toBe('unknown')
    expect(watermark?.hasDigitalSignatures.value).toBe(false)
    expect(watermark?.canGenerate.value).toBe(true)
    scope.stop()
  })

  it('快速換檔時不讓舊文件的簽章掃描覆寫新文件狀態', async () => {
    const firstFieldObjects = createDeferred<Record<string, Array<{ fieldType: string }>>>()
    const firstTask = {
      destroy: vi.fn(async () => undefined),
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getFieldObjects: vi.fn(() => firstFieldObjects.promise),
        getPage: pdfMocks.getPage,
        numPages: 2,
      }),
    }
    const secondTask = {
      destroy: vi.fn(async () => undefined),
      promise: Promise.resolve({
        cleanup: vi.fn(async () => undefined),
        getFieldObjects: vi.fn(async () => null),
        getPage: pdfMocks.getPage,
        numPages: 3,
      }),
    }
    pdfMocks.getDocument
      .mockReturnValueOnce(firstTask)
      .mockReturnValueOnce(secondTask)
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const firstFile = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '舊文件.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File
    const secondFile = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '新文件.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    const firstSelection = watermark?.selectFile(firstFile)
    await vi.waitFor(() =>
      expect(watermark?.digitalSignatureState.value).toBe('checking'),
    )
    await watermark?.selectFile(secondFile)
    firstFieldObjects.resolve({ approval: [{ fieldType: 'Sig' }] })
    await firstSelection

    expect(watermark?.selectedFile.value).toBe(secondFile)
    expect(watermark?.pageCount.value).toBe(3)
    expect(watermark?.documentState.value).toBe('ready')
    expect(watermark?.digitalSignatureState.value).toBe('none')
    expect(watermark?.hasDigitalSignatures.value).toBe(false)
    scope.stop()
  })

  it('快速選擇兩張圖片時只保留最新結果且不建立過期 Object URL', async () => {
    const firstBuffer = createDeferred<ArrayBuffer>()
    vi.mocked(URL.createObjectURL).mockImplementation(
      (value) => `blob:${(value as File).name}`,
    )
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const firstFile = {
      arrayBuffer: vi.fn(() => firstBuffer.promise),
      name: '舊標誌.png',
      size: 24,
      type: 'image/png',
    } as unknown as File
    const secondFile = {
      arrayBuffer: vi.fn(async () => createPngHeader(800, 400)),
      name: '新標誌.png',
      size: 24,
      type: 'image/png',
    } as unknown as File

    const firstSelection = watermark?.selectWatermarkImage(firstFile)
    await watermark?.selectWatermarkImage(secondFile)
    firstBuffer.resolve(createPngHeader(600, 300))
    await firstSelection

    expect(watermark?.watermarkImageFile.value).toBe(secondFile)
    expect(watermark?.watermarkImageUrl.value).toBe('blob:新標誌.png')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.createObjectURL).toHaveBeenCalledWith(secondFile)
    scope.stop()
  })

  it('準備輸入資料失敗時回復可操作狀態且不建立 Worker', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const arrayBuffer = vi
      .fn<() => Promise<ArrayBuffer>>()
      .mockResolvedValueOnce(new ArrayBuffer(8))
      .mockRejectedValueOnce(new Error('read failed'))
    const file = {
      arrayBuffer,
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    await expect(watermark?.generate()).resolves.toBeUndefined()

    expect(watermark?.generationState.value).toBe('failed')
    expect(watermark?.generationStage.value).toBeNull()
    expect(watermark?.generationMessage.value).toBe('無法準備 PDF 或浮水印資料，請再試一次。')
    expect(MockWorker.instances).toHaveLength(0)
    scope.stop()
  })

  it('清除文件時釋放預覽並重設文件與產生狀態', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    await watermark?.clearFile()

    expect(watermark?.selectedFile.value).toBeNull()
    expect(watermark?.documentState.value).toBe('idle')
    expect(watermark?.pageCount.value).toBe(0)
    expect(watermark?.previewState.value).toBe('idle')
    expect(watermark?.generationState.value).toBe('idle')
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    scope.stop()
  })

  it('瀏覽器無法建立 Worker 時顯示失敗而不讓 generate 拋錯', async () => {
    const scope = effectScope()
    const watermark = scope.run(() => usePdfWatermark())
    const file = {
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      name: '年度報告.pdf',
      size: 8,
      type: 'application/pdf',
    } as unknown as File

    await watermark?.selectFile(file)
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('Worker unavailable')
        }
      },
    )

    await expect(watermark?.generate()).resolves.toBeUndefined()

    expect(watermark?.generationState.value).toBe('failed')
    expect(watermark?.generationStage.value).toBeNull()
    expect(watermark?.generationMessage.value).toBe('瀏覽器無法啟動 PDF 處理程序。')
    scope.stop()
  })
})
