export type Base64Operation = 'encode' | 'decode'
export type Base64Alphabet = 'standard' | 'url-safe'

export interface Base64TransformOptions {
  alphabet?: Base64Alphabet
}

export interface Base64TransformResult {
  ok: boolean
  output?: string
  issue?: string
}

interface Base64BufferLike {
  length: number
  [index: number]: number
  toString: (encoding: string) => string
}

interface Base64BufferFactory {
  from: (input: string | Uint8Array, encoding?: string) => Base64BufferLike
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', { fatal: true })
const base64ChunkSize = 0x8000

function getBufferFactory() {
  return (globalThis as typeof globalThis & { Buffer?: Base64BufferFactory }).Buffer
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof btoa === 'function') {
    let binary = ''

    for (let index = 0; index < bytes.length; index += base64ChunkSize) {
      binary += String.fromCharCode(...bytes.slice(index, index + base64ChunkSize))
    }

    return btoa(binary)
  }

  const bufferFactory = getBufferFactory()

  if (!bufferFactory) {
    throw new Error('此瀏覽器不支援 Base64 編碼。')
  }

  return bufferFactory.from(bytes).toString('base64')
}

function base64ToBytes(base64: string) {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  }

  const bufferFactory = getBufferFactory()

  if (!bufferFactory) {
    throw new Error('此瀏覽器不支援 Base64 解碼。')
  }

  const buffer = bufferFactory.from(base64, 'base64')
  return Uint8Array.from({ length: buffer.length }, (_, index) => buffer[index])
}

function applyAlphabet(base64: string, alphabet: Base64Alphabet) {
  if (alphabet === 'standard') {
    return base64
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function normalizeBase64Input(source: string, alphabet: Base64Alphabet) {
  const compactSource = source.replace(/\s+/g, '')
  const standardSource =
    alphabet === 'url-safe' ? compactSource.replace(/-/g, '+').replace(/_/g, '/') : compactSource

  if (!standardSource) {
    return ''
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(standardSource) || /=.*[^=]/.test(standardSource)) {
    throw new Error('Base64 內容包含無效字元。')
  }

  if (standardSource.length % 4 === 1) {
    throw new Error('Base64 長度不正確。')
  }

  return standardSource.padEnd(Math.ceil(standardSource.length / 4) * 4, '=')
}

export function encodeBase64Text(source: string, options: Base64TransformOptions = {}): Base64TransformResult {
  try {
    const alphabet = options.alphabet ?? 'standard'
    return {
      ok: true,
      output: applyAlphabet(bytesToBase64(textEncoder.encode(source)), alphabet),
    }
  } catch (error) {
    return {
      ok: false,
      issue: error instanceof Error ? error.message : '無法編碼 Base64。',
    }
  }
}

export function decodeBase64Text(source: string, options: Base64TransformOptions = {}): Base64TransformResult {
  try {
    const alphabet = options.alphabet ?? 'standard'
    const normalizedSource = normalizeBase64Input(source, alphabet)
    return {
      ok: true,
      output: normalizedSource ? textDecoder.decode(base64ToBytes(normalizedSource)) : '',
    }
  } catch (error) {
    return {
      ok: false,
      issue: error instanceof Error ? error.message : '無法解碼 Base64。',
    }
  }
}

export function transformBase64Text(
  source: string,
  operation: Base64Operation,
  options: Base64TransformOptions = {},
) {
  return operation === 'encode' ? encodeBase64Text(source, options) : decodeBase64Text(source, options)
}

export function summarizeBase64Input(source: string, maxLength = 72) {
  const trimmedSource = source.trim().replace(/\s+/g, ' ')

  if (trimmedSource.length <= maxLength) {
    return trimmedSource || '空白輸入'
  }

  return `${trimmedSource.slice(0, maxLength - 1)}…`
}
