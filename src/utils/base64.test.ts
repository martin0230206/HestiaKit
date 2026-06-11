import { describe, expect, it } from 'vitest'
import {
  decodeBase64Text,
  encodeBase64Text,
  summarizeBase64Input,
  transformBase64Text,
} from './base64'

describe('base64', () => {
  it('encodes UTF-8 text to Base64', () => {
    const result = encodeBase64Text('HestiaKit 測試')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('SGVzdGlhS2l0IOa4rOippg==')
  })

  it('decodes Base64 to UTF-8 text', () => {
    const result = decodeBase64Text('SGVzdGlhS2l0IOa4rOippg==')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('HestiaKit 測試')
  })

  it('supports URL-safe Base64 without padding', () => {
    const encoded = encodeBase64Text('?>', { alphabet: 'url-safe' })
    const decoded = decodeBase64Text(encoded.output ?? '', { alphabet: 'url-safe' })

    expect(encoded.ok).toBe(true)
    expect(encoded.output).toBe('Pz4')
    expect(decoded.ok).toBe(true)
    expect(decoded.output).toBe('?>')
  })

  it('accepts missing decode padding', () => {
    const result = transformBase64Text('SGk', 'decode')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('Hi')
  })

  it('reports invalid Base64 input', () => {
    const result = decodeBase64Text('not valid!')

    expect(result.ok).toBe(false)
    expect(result.issue).toBeTruthy()
  })

  it('summarizes long inputs', () => {
    const summary = summarizeBase64Input('a'.repeat(90), 12)

    expect(summary).toBe('aaaaaaaaaaa…')
  })
})
