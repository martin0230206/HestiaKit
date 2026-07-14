import {
  addPdfWatermark,
  mapPdfWatermarkWriterError,
  type PdfWatermarkImageFormat,
  type PdfWatermarkWriterErrorCode,
  type PdfWatermarkWriterOptions,
  type PdfWatermarkWriterProgress,
} from '../utils/pdfWatermarkWriter'

export interface PdfWatermarkWorkerInput {
  options: PdfWatermarkWriterOptions
  pdfBuffer: ArrayBuffer
  selectedPages: number[]
  watermarkBuffer: ArrayBuffer
  watermarkFormat: PdfWatermarkImageFormat
}

export interface PdfWatermarkWorkerRequest {
  input: PdfWatermarkWorkerInput
  jobId: string
  type: 'generate'
}

export interface PdfWatermarkWorkerProgressResponse {
  jobId: string
  progress: PdfWatermarkWriterProgress
  type: 'progress'
}

export interface PdfWatermarkWorkerSuccessResponse {
  jobId: string
  pdfBuffer: ArrayBuffer
  type: 'success'
}

export interface PdfWatermarkWorkerErrorResponse {
  error: {
    code: PdfWatermarkWriterErrorCode
    message: string
  }
  jobId: string
  type: 'error'
}

export type PdfWatermarkWorkerResponse =
  | PdfWatermarkWorkerProgressResponse
  | PdfWatermarkWorkerSuccessResponse
  | PdfWatermarkWorkerErrorResponse

interface PdfWatermarkWorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<PdfWatermarkWorkerRequest>) => void,
  ): void
  postMessage(message: PdfWatermarkWorkerResponse, transfer?: Transferable[]): void
}

const workerScope = self as unknown as PdfWatermarkWorkerScope

workerScope.addEventListener('message', (event) => {
  if (event.data?.type !== 'generate') return
  void generateWatermarkedPdf(event.data)
})

async function generateWatermarkedPdf(
  request: PdfWatermarkWorkerRequest,
): Promise<void> {
  const { input, jobId } = request

  try {
    const outputBytes = await addPdfWatermark(
      {
        options: input.options,
        pdfBytes: new Uint8Array(input.pdfBuffer),
        selectedPages: input.selectedPages,
        watermarkBytes: new Uint8Array(input.watermarkBuffer),
        watermarkFormat: input.watermarkFormat,
      },
      (progress) => {
        workerScope.postMessage({ jobId, progress, type: 'progress' })
      },
    )

    const pdfBuffer = getTransferableBuffer(outputBytes)
    workerScope.postMessage({ jobId, pdfBuffer, type: 'success' }, [pdfBuffer])
  } catch (error) {
    const mappedError = mapPdfWatermarkWriterError(error)
    workerScope.postMessage({
      error: { code: mappedError.code, message: mappedError.message },
      jobId,
      type: 'error',
    })
  }
}

function getTransferableBuffer(bytes: Uint8Array): ArrayBuffer {
  if (
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes.buffer
  }

  return bytes.slice().buffer
}
