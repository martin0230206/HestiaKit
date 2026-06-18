import { describe, expect, it } from 'vitest'
import { convertJsonToMarkdownTable, escapeMarkdownTableCell, getMarkdownTableStats } from './jsonMarkdownTable'

describe('jsonMarkdownTable', () => {
  it('converts an array of objects to a Markdown table', () => {
    const result = convertJsonToMarkdownTable(
      JSON.stringify([
        { name: 'HestiaKit', type: 'toolbox', enabled: true },
        { name: 'JSON 轉表格', type: 'format' },
      ]),
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '| name | type | enabled |\n| --- | --- | --- |\n| HestiaKit | toolbox | true |\n| JSON 轉表格 | format |  |',
    )
  })

  it('converts a single object to a key value table', () => {
    const result = convertJsonToMarkdownTable('{"name":"HestiaKit","private":true,"tools":["json","markdown"]}')

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '| key | value |\n| --- | --- |\n| name | HestiaKit |\n| private | true |\n| tools | ["json","markdown"] |',
    )
  })

  it('converts primitive arrays with a value column', () => {
    const result = convertJsonToMarkdownTable('["A","B","C"]')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('| value |\n| --- |\n| A |\n| B |\n| C |')
  })

  it('escapes table separators and normalizes line breaks', () => {
    expect(escapeMarkdownTableCell('A | B\nC')).toBe('A \\| B<br>C')
  })

  it('reports invalid JSON', () => {
    const result = convertJsonToMarkdownTable('{"name":}')

    expect(result.ok).toBe(false)
    expect(result.output).toBe('')
    expect(result.issue?.message).toBeTruthy()
  })

  it('reports empty arrays as non-tabular data', () => {
    const result = convertJsonToMarkdownTable('[]')

    expect(result.ok).toBe(false)
    expect(result.issue?.message).toContain('沒有可轉換')
  })

  it('counts generated table columns and rows', () => {
    expect(getMarkdownTableStats('| a | b \\| c |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |')).toEqual({
      columns: 2,
      rows: 2,
    })
  })
})
