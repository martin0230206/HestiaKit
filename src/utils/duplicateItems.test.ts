import { describe, expect, it } from 'vitest'
import { removeDuplicateItems, summarizeDuplicateItemsInput } from './duplicateItems'

describe('duplicateItems', () => {
  it('removes duplicate line items and keeps the first occurrence', () => {
    const result = removeDuplicateItems('1\n1\n1\n2\n2\n3\n3\n3\n3')

    expect(result.output).toBe('1\n2\n3')
    expect(result.stats).toEqual({
      sourceItems: 9,
      outputItems: 3,
      duplicateItems: 6,
      skippedEmptyItems: 0,
    })
  })

  it('preserves the order of first occurrences', () => {
    const result = removeDuplicateItems('banana\napple\nbanana\npear\napple')

    expect(result.output).toBe('banana\napple\npear')
  })

  it('trims items before comparison by default', () => {
    const result = removeDuplicateItems('  apple\napple  \n banana ')

    expect(result.output).toBe('apple\nbanana')
  })

  it('can compare items without trimming whitespace', () => {
    const result = removeDuplicateItems(' apple\napple', { trimItems: false })

    expect(result.output).toBe(' apple\napple')
    expect(result.stats.duplicateItems).toBe(0)
  })

  it('can compare items case-insensitively while keeping the first value', () => {
    const result = removeDuplicateItems('Apple\napple\nBANANA\nbanana', { ignoreCase: true })

    expect(result.output).toBe('Apple\nBANANA')
    expect(result.stats.duplicateItems).toBe(2)
  })

  it('skips empty items by default', () => {
    const result = removeDuplicateItems('apple\n\napple\n ')

    expect(result.output).toBe('apple')
    expect(result.stats).toEqual({
      sourceItems: 4,
      outputItems: 1,
      duplicateItems: 1,
      skippedEmptyItems: 2,
    })
  })

  it('can keep one empty item when empty items are not ignored', () => {
    const result = removeDuplicateItems('\napple\n\napple', { ignoreEmptyItems: false })

    expect(result.output).toBe('\napple')
    expect(result.stats).toEqual({
      sourceItems: 4,
      outputItems: 2,
      duplicateItems: 2,
      skippedEmptyItems: 0,
    })
  })

  it('summarizes long inputs', () => {
    expect(summarizeDuplicateItemsInput('a'.repeat(90), 12)).toBe('aaaaaaaaaaa...')
  })
})
