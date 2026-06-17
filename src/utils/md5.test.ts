import { describe, expect, it } from 'vitest'
import { createMd5Hash, summarizeMd5Input } from './md5'

describe('md5', () => {
  it('hashes empty text', () => {
    expect(createMd5Hash('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('hashes UTF-8 text', () => {
    expect(createMd5Hash('HestiaKit 測試')).toBe('74f2799c6a6555b9dd98bc6d69f5ad6f')
  })

  it('supports uppercase output', () => {
    expect(createMd5Hash('HestiaKit', { letterCase: 'upper' })).toBe('1C1FC19DCD5DC45DCC5D7EBCB3EFA599')
  })

  it('summarizes long inputs', () => {
    expect(summarizeMd5Input('a'.repeat(90), 12)).toBe('aaaaaaaaaaa…')
  })
})
