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

  it('flattens nested object fields into dot path columns', () => {
    const result = convertJsonToMarkdownTable(
      JSON.stringify([
        {
          id: 1,
          user: {
            name: 'Customer A',
            email: 'customer-a@example.com',
          },
          tags: ['admin', 'beta'],
        },
      ]),
      { mode: 'flatten' },
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '| id | user.name | user.email | tags[0] | tags[1] |\n| --- | --- | --- | --- | --- |\n| 1 | Customer A | customer-a@example.com | admin | beta |',
    )
  })

  it('converts a flattened root object to a single data row', () => {
    const result = convertJsonToMarkdownTable(
      '{"id":"A001","customer":{"name":"Customer A"},"items":[{"name":"Keyboard","qty":1}]}',
      { mode: 'flatten' },
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '| id | customer.name | items[0].name | items[0].qty |\n| --- | --- | --- | --- |\n| A001 | Customer A | Keyboard | 1 |',
    )
  })

  it('flattens arrays of nested objects with indexed paths', () => {
    const result = convertJsonToMarkdownTable(
      JSON.stringify([
        {
          orderId: 'A001',
          items: [
            { name: 'Keyboard', qty: 1 },
            { name: 'Mouse', qty: 2 },
          ],
        },
        {
          orderId: 'A002',
          items: [{ name: 'Monitor', qty: 1 }],
        },
      ]),
      { mode: 'flatten' },
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '| orderId | items[0].name | items[0].qty | items[1].name | items[1].qty |\n| --- | --- | --- | --- | --- |\n| A001 | Keyboard | 1 | Mouse | 2 |\n| A002 | Monitor | 1 |  |  |',
    )
  })

  it('creates multiple tables for nested arrays of objects', () => {
    const result = convertJsonToMarkdownTable(
      JSON.stringify({
        orderId: 'A001',
        customer: {
          name: 'Customer A',
        },
        items: [
          { name: 'Keyboard', qty: 1 },
          { name: 'Mouse', qty: 2 },
        ],
      }),
      { mode: 'multi-table' },
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '### root\n\n| orderId | customer.name | items |\n| --- | --- | --- |\n| A001 | Customer A | 2 筆 |\n\n### items\n\n| name | qty |\n| --- | --- |\n| Keyboard | 1 |\n| Mouse | 2 |',
    )
  })

  it('names child tables from nested array row paths', () => {
    const result = convertJsonToMarkdownTable(
      JSON.stringify([
        {
          id: 1,
          customer: {
            orders: [{ id: 'A001' }],
          },
          items: [
            {
              name: 'Keyboard',
              components: [{ name: 'switch' }],
            },
          ],
        },
      ]),
      { mode: 'multi-table' },
    )

    expect(result.ok).toBe(true)
    expect(result.output).toContain('### root[0].customer.orders')
    expect(result.output).toContain('### root[0].items')
    expect(result.output).toContain('### root[0].items[0].components')
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

  it('counts rows across multiple generated tables', () => {
    expect(
      getMarkdownTableStats(
        '### root\n\n| id | items |\n| --- | --- |\n| A001 | 2 筆 |\n\n### items\n\n| name | qty |\n| --- | --- |\n| Keyboard | 1 |\n| Mouse | 2 |',
      ),
    ).toEqual({
      columns: 2,
      rows: 3,
    })
  })
})
