import { describe, expect, it, vi } from 'vitest'
import {
  encodeBase64Password,
  estimatePasswordStrength,
  generateMemorablePassword,
  generatePinPassword,
  generateRandomPassword,
} from './passwordGenerator'

vi.stubGlobal('crypto', {
  getRandomValues: (array: Uint32Array) => {
    array[0] = Math.floor(Math.random() * 1_000_000)
    return array
  },
})

describe('passwordGenerator', () => {
  it('generates random passwords with the requested length', () => {
    const password = generateRandomPassword({
      length: 24,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
    })

    expect(password).toHaveLength(24)
  })

  it('returns an empty password when no random character pools are enabled', () => {
    const password = generateRandomPassword({
      length: 16,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: false,
    })

    expect(password).toBe('')
  })

  it('uses only the selected symbols when a custom symbol set is provided', () => {
    const password = generateRandomPassword({
      length: 12,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: true,
      symbols: '@',
    })

    expect(password).toBe('@'.repeat(12))
  })

  it('does not add a symbol pool when the selected symbol set is empty', () => {
    const password = generateRandomPassword({
      length: 12,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: true,
      symbols: '',
    })

    expect(password).toBe('')
  })

  it('generates numeric-only pin passwords', () => {
    const pin = generatePinPassword({ length: 8 })

    expect(pin).toMatch(/^\d{8}$/)
  })

  it('generates memorable passwords with the selected separator', () => {
    const password = generateMemorablePassword({
      wordCount: 4,
      separator: '-',
      includeNumber: false,
      capitalize: false,
    })

    expect(password.split('-')).toHaveLength(4)
  })

  it('encodes generated passwords with base64', () => {
    expect(encodeBase64Password('Password-42')).toBe('UGFzc3dvcmQtNDI=')
  })

  it('estimates stronger passwords as excellent', () => {
    expect(estimatePasswordStrength('Long-Password-With-42-Symbols')).toBe('Excellent')
  })
})
