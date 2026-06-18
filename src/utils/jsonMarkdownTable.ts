import { parseJsonDocument, type JsonParseIssue } from './jsonEditor'

export interface JsonMarkdownTableResult {
  ok: boolean
  output: string
  issue?: JsonParseIssue
}

export interface JsonMarkdownTableStats {
  columns: number
  rows: number
}

type JsonRecord = Record<string, unknown>

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function createIssue(message: string): JsonParseIssue {
  return { message }
}

function stringifyCellValue(value: unknown) {
  if (value === undefined) {
    return ''
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

export function escapeMarkdownTableCell(value: unknown) {
  return stringifyCellValue(value)
    .replace(/\r\n|\r|\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim()
}

function createMarkdownTable(headers: string[], rows: unknown[][]) {
  const headerRow = `| ${headers.map(escapeMarkdownTableCell).join(' | ')} |`
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
  const bodyRows = rows.map((row) => `| ${row.map(escapeMarkdownTableCell).join(' | ')} |`)

  return [headerRow, separatorRow, ...bodyRows].join('\n')
}

function collectColumns(items: unknown[]) {
  const columns: string[] = []

  items.forEach((item) => {
    if (!isJsonRecord(item)) {
      if (!columns.includes('value')) {
        columns.push('value')
      }

      return
    }

    Object.keys(item).forEach((key) => {
      if (!columns.includes(key)) {
        columns.push(key)
      }
    })
  })

  return columns
}

function convertArrayToTable(value: unknown[]) {
  if (value.length === 0) {
    return {
      ok: false,
      output: '',
      issue: createIssue('JSON 陣列沒有可轉換的資料列。'),
    }
  }

  const columns = collectColumns(value)

  if (columns.length === 0) {
    return {
      ok: false,
      output: '',
      issue: createIssue('JSON 陣列中的物件沒有欄位。'),
    }
  }

  return {
    ok: true,
    output: createMarkdownTable(
      columns,
      value.map((item) => (isJsonRecord(item) ? columns.map((column) => item[column]) : columns.map((column) => (column === 'value' ? item : undefined)))),
    ),
  }
}

function convertObjectToTable(value: JsonRecord) {
  const entries = Object.entries(value)

  if (entries.length === 0) {
    return {
      ok: false,
      output: '',
      issue: createIssue('JSON 物件沒有可轉換的欄位。'),
    }
  }

  return {
    ok: true,
    output: createMarkdownTable(['key', 'value'], entries),
  }
}

function convertPrimitiveToTable(value: unknown) {
  return {
    ok: true,
    output: createMarkdownTable(['value'], [[value]]),
  }
}

function isEscapedPipe(markdown: string, index: number) {
  let slashCount = 0

  for (let cursor = index - 1; cursor >= 0 && markdown[cursor] === '\\'; cursor -= 1) {
    slashCount += 1
  }

  return slashCount % 2 === 1
}

function countMarkdownTableCells(row: string) {
  const separatorCount = Array.from(row).reduce((count, character, index) => {
    if (character !== '|' || isEscapedPipe(row, index)) {
      return count
    }

    return count + 1
  }, 0)

  return Math.max(0, separatorCount - 1)
}

export function convertJsonToMarkdownTable(source: string): JsonMarkdownTableResult {
  if (!source.trim()) {
    return {
      ok: true,
      output: '',
    }
  }

  const result = parseJsonDocument(source)

  if (!result.ok) {
    return {
      ok: false,
      output: '',
      issue: result.issue,
    }
  }

  if (Array.isArray(result.value)) {
    return convertArrayToTable(result.value)
  }

  if (isJsonRecord(result.value)) {
    return convertObjectToTable(result.value)
  }

  return convertPrimitiveToTable(result.value)
}

export function getMarkdownTableStats(markdown: string): JsonMarkdownTableStats {
  const rows = markdown
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().startsWith('|') && !/^\|\s*-+/.test(line.trim()))

  if (rows.length === 0) {
    return {
      columns: 0,
      rows: 0,
    }
  }

  return {
    columns: countMarkdownTableCells(rows[0]),
    rows: Math.max(0, rows.length - 1),
  }
}
