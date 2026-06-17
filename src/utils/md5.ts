export type Md5LetterCase = 'lower' | 'upper'

export interface Md5HashOptions {
  letterCase?: Md5LetterCase
}

const textEncoder = new TextEncoder()
const shiftAmounts = [
  7, 12, 17, 22,
  7, 12, 17, 22,
  7, 12, 17, 22,
  7, 12, 17, 22,
  5, 9, 14, 20,
  5, 9, 14, 20,
  5, 9, 14, 20,
  5, 9, 14, 20,
  4, 11, 16, 23,
  4, 11, 16, 23,
  4, 11, 16, 23,
  4, 11, 16, 23,
  6, 10, 15, 21,
  6, 10, 15, 21,
  6, 10, 15, 21,
  6, 10, 15, 21,
]
const constants = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0,
)

function rotateLeft(value: number, amount: number) {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0
}

function addUnsigned(...values: number[]) {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0)
}

function createPaddedMessage(bytes: Uint8Array) {
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64
  const message = new Uint8Array(paddedLength)
  const dataView = new DataView(message.buffer)
  const bitLengthLow = ((bytes.length % 0x20000000) * 8) >>> 0
  const bitLengthHigh = Math.floor(bytes.length / 0x20000000) >>> 0

  message.set(bytes)
  message[bytes.length] = 0x80
  dataView.setUint32(paddedLength - 8, bitLengthLow, true)
  dataView.setUint32(paddedLength - 4, bitLengthHigh, true)

  return dataView
}

function wordToHex(word: number) {
  return [0, 8, 16, 24]
    .map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, '0'))
    .join('')
}

export function createMd5Hash(source: string, options: Md5HashOptions = {}) {
  const message = createPaddedMessage(textEncoder.encode(source))
  const words = new Array<number>(16)
  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let offset = 0; offset < message.byteLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = message.getUint32(offset + index * 4, true)
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f = 0
      let wordIndex = 0

      if (index < 16) {
        f = (b & c) | (~b & d)
        wordIndex = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        wordIndex = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        wordIndex = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        wordIndex = (7 * index) % 16
      }

      const nextD = c
      const nextC = b
      const rotated = rotateLeft(addUnsigned(a, f, constants[index], words[wordIndex]), shiftAmounts[index])
      b = addUnsigned(b, rotated)
      a = d
      d = nextD
      c = nextC
    }

    a0 = addUnsigned(a0, a)
    b0 = addUnsigned(b0, b)
    c0 = addUnsigned(c0, c)
    d0 = addUnsigned(d0, d)
  }

  const hash = [a0, b0, c0, d0].map(wordToHex).join('')
  return options.letterCase === 'upper' ? hash.toUpperCase() : hash
}

export function summarizeMd5Input(source: string, maxLength = 72) {
  const trimmedSource = source.trim().replace(/\s+/g, ' ')

  if (trimmedSource.length <= maxLength) {
    return trimmedSource || '空白輸入'
  }

  return `${trimmedSource.slice(0, maxLength - 1)}…`
}
