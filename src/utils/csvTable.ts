export interface CsvParseIssue {
  message: string
  line?: number
  column?: number
}

export interface CsvTable {
  headers: string[]
  rows: string[][]
}

export interface CsvTableOptions {
  hasHeader?: boolean
}

export interface CsvTableResult {
  ok: boolean
  table: CsvTable
  issue?: CsvParseIssue
}

export interface CsvSourceStats {
  characters: number
  lines: number
}

export interface CsvTableStats {
  columns: number
  rows: number
  cells: number
}

interface CsvRowsResult {
  ok: boolean
  rows: string[][]
  issue?: CsvParseIssue
}

const emptyTable: CsvTable = {
  headers: [],
  rows: [],
}

function createIssue(message: string, line?: number, column?: number): CsvParseIssue {
  return { message, line, column }
}

function normalizeSource(source: string) {
  return source.replace(/^\uFEFF/, '')
}

function sourceEndsWithLineBreak(source: string) {
  return source.endsWith('\n') || source.endsWith('\r')
}

function parseCsvRows(source: string): CsvRowsResult {
  const normalizedSource = normalizeSource(source)

  if (!normalizedSource.trim()) {
    return {
      ok: true,
      rows: [],
    }
  }

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotedCell = false
  let quoteStartLine = 1
  let quoteStartColumn = 1
  let line = 1
  let column = 1

  for (let index = 0; index < normalizedSource.length; index += 1) {
    const character = normalizedSource[index]

    if (inQuotedCell) {
      if (character === '"') {
        if (normalizedSource[index + 1] === '"') {
          cell += '"'
          index += 1
          column += 2
          continue
        }

        inQuotedCell = false
        column += 1
        continue
      }

      if (character === '\r') {
        cell += '\n'

        if (normalizedSource[index + 1] === '\n') {
          index += 1
        }

        line += 1
        column = 1
        continue
      }

      if (character === '\n') {
        cell += '\n'
        line += 1
        column = 1
        continue
      }

      cell += character
      column += 1
      continue
    }

    if (character === '"') {
      if (cell.length === 0) {
        inQuotedCell = true
        quoteStartLine = line
        quoteStartColumn = column
        column += 1
        continue
      }

      return {
        ok: false,
        rows: [],
        issue: createIssue('未加引號的欄位中不能直接包含雙引號。', line, column),
      }
    }

    if (character === ',') {
      row.push(cell)
      cell = ''
      column += 1
      continue
    }

    if (character === '\r') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''

      if (normalizedSource[index + 1] === '\n') {
        index += 1
      }

      line += 1
      column = 1
      continue
    }

    if (character === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      line += 1
      column = 1
      continue
    }

    cell += character
    column += 1
  }

  if (inQuotedCell) {
    return {
      ok: false,
      rows: [],
      issue: createIssue('CSV 欄位的雙引號尚未結束。', quoteStartLine, quoteStartColumn),
    }
  }

  if (cell.length > 0 || row.length > 0 || !sourceEndsWithLineBreak(normalizedSource)) {
    row.push(cell)
    rows.push(row)
  }

  return {
    ok: true,
    rows,
  }
}

function createColumnLabel(index: number) {
  return `欄位 ${index + 1}`
}

function normalizeHeaderCell(cell: string, index: number) {
  return cell.trim() || createColumnLabel(index)
}

function normalizeRow(row: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => row[index] ?? '')
}

function createCsvTable(rows: string[][], hasHeader: boolean): CsvTable {
  const columnCount = Math.max(0, ...rows.map((row) => row.length))

  if (columnCount === 0) {
    return emptyTable
  }

  if (hasHeader) {
    const headerRow = rows[0] ?? []

    return {
      headers: normalizeRow(headerRow, columnCount).map(normalizeHeaderCell),
      rows: rows.slice(1).map((row) => normalizeRow(row, columnCount)),
    }
  }

  return {
    headers: Array.from({ length: columnCount }, (_, index) => createColumnLabel(index)),
    rows: rows.map((row) => normalizeRow(row, columnCount)),
  }
}

export function parseCsvTable(source: string, options: CsvTableOptions = {}): CsvTableResult {
  const rowsResult = parseCsvRows(source)

  if (!rowsResult.ok) {
    return {
      ok: false,
      table: emptyTable,
      issue: rowsResult.issue,
    }
  }

  return {
    ok: true,
    table: createCsvTable(rowsResult.rows, options.hasHeader ?? true),
  }
}

export function getCsvSourceStats(source: string): CsvSourceStats {
  return {
    characters: source.length,
    lines: source ? source.split(/\r\n|\r|\n/).length : 1,
  }
}

export function getCsvTableStats(table: CsvTable): CsvTableStats {
  return {
    columns: table.headers.length,
    rows: table.rows.length,
    cells: table.headers.length * table.rows.length,
  }
}

function formatTsvCell(value: string) {
  if (!/[\t\r\n"]/.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '""')}"`
}

export function createTsvTableText(table: CsvTable) {
  if (table.headers.length === 0) {
    return ''
  }

  return [table.headers, ...table.rows]
    .map((row) => row.map(formatTsvCell).join('\t'))
    .join('\n')
}
