import { describe, expect, it } from 'vitest'
import { createTsvTableText, getCsvSourceStats, getCsvTableStats, parseCsvTable } from './csvTable'

describe('csvTable', () => {
  it('parses CSV with the first row as headers', () => {
    const result = parseCsvTable('姓名,部門,狀態\n王小明,營運,啟用\n陳小華,研發,停用')

    expect(result.ok).toBe(true)
    expect(result.table).toEqual({
      headers: ['姓名', '部門', '狀態'],
      rows: [
        ['王小明', '營運', '啟用'],
        ['陳小華', '研發', '停用'],
      ],
    })
  })

  it('generates column labels when the first row is data', () => {
    const result = parseCsvTable('A001,320\nA002,180', { hasHeader: false })

    expect(result.ok).toBe(true)
    expect(result.table).toEqual({
      headers: ['欄位 1', '欄位 2'],
      rows: [
        ['A001', '320'],
        ['A002', '180'],
      ],
    })
  })

  it('supports quoted commas, line breaks, and escaped quotes', () => {
    const result = parseCsvTable('name,note\n"HestiaKit","CSV, 表格\n包含 ""quoted"" 文字"')

    expect(result.ok).toBe(true)
    expect(result.table.rows).toEqual([
      ['HestiaKit', 'CSV, 表格\n包含 "quoted" 文字'],
    ])
  })

  it('pads uneven rows to the widest row', () => {
    const result = parseCsvTable('id,name,role\n1,Ada\n2,Grace,Admin,Extra')

    expect(result.ok).toBe(true)
    expect(result.table).toEqual({
      headers: ['id', 'name', 'role', '欄位 4'],
      rows: [
        ['1', 'Ada', '', ''],
        ['2', 'Grace', 'Admin', 'Extra'],
      ],
    })
  })

  it('ignores a UTF-8 BOM and a final line break', () => {
    const result = parseCsvTable('\uFEFFid,name\r\n1,Ada\r\n')

    expect(result.ok).toBe(true)
    expect(result.table).toEqual({
      headers: ['id', 'name'],
      rows: [['1', 'Ada']],
    })
  })

  it('reports an unfinished quoted field', () => {
    const result = parseCsvTable('id,note\n1,"missing end')

    expect(result.ok).toBe(false)
    expect(result.issue).toEqual({
      message: 'CSV 欄位的雙引號尚未結束。',
      line: 2,
      column: 3,
    })
  })

  it('returns an empty table for blank input', () => {
    const result = parseCsvTable('   \n')

    expect(result.ok).toBe(true)
    expect(result.table).toEqual({
      headers: [],
      rows: [],
    })
  })

  it('counts source and table stats', () => {
    const result = parseCsvTable('a,b\n1,2\n3,4')

    expect(getCsvSourceStats('a,b\n1,2\n3,4')).toEqual({
      characters: 11,
      lines: 3,
    })
    expect(getCsvTableStats(result.table)).toEqual({
      columns: 2,
      rows: 2,
      cells: 4,
    })
  })

  it('creates TSV text for copying the preview table', () => {
    const result = parseCsvTable('name,note\n"HestiaKit","CSV\t表格\n包含 ""quoted"" 文字"')

    expect(createTsvTableText(result.table)).toBe('name\tnote\nHestiaKit\t"CSV\t表格\n包含 ""quoted"" 文字"')
  })
})
