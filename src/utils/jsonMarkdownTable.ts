import { parseJsonDocument, type JsonParseIssue } from './jsonEditor'

export type JsonMarkdownTableMode = 'conservative' | 'flatten' | 'multi-table'

export interface JsonMarkdownTableOptions {
  mode?: JsonMarkdownTableMode
}

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

interface MarkdownTable {
  title?: string
  headers: string[]
  rows: unknown[][]
}

interface FlattenRecordOptions {
  arrayMode?: 'indexed' | 'joined'
  summarizeArrayRecords?: boolean
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPlainCellValue(value: unknown) {
  return value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value)
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

function formatArrayRecordCount(value: unknown[]) {
  return `${value.length} 筆`
}

export function escapeMarkdownTableCell(value: unknown) {
  return stringifyCellValue(value)
    .replace(/\r\n|\r|\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim()
}

function createMarkdownTable(table: MarkdownTable) {
  const headerRow = `| ${table.headers.map(escapeMarkdownTableCell).join(' | ')} |`
  const separatorRow = `| ${table.headers.map(() => '---').join(' | ')} |`
  const bodyRows = table.rows.map((row) => `| ${row.map(escapeMarkdownTableCell).join(' | ')} |`)

  return [headerRow, separatorRow, ...bodyRows].join('\n')
}

function createMarkdownTableDocument(tables: MarkdownTable[]) {
  const includeTitles = tables.length > 1

  return tables
    .map((table) => {
      const tableMarkdown = createMarkdownTable(table)

      return includeTitles && table.title ? `### ${table.title}\n\n${tableMarkdown}` : tableMarkdown
    })
    .join('\n\n')
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

function collectRecordColumns(records: JsonRecord[]) {
  const columns: string[] = []

  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (!columns.includes(key)) {
        columns.push(key)
      }
    })
  })

  return columns
}

function convertArrayToTable(value: unknown[]): JsonMarkdownTableResult {
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
    output: createMarkdownTable({
      headers: columns,
      rows: value.map((item) =>
        isJsonRecord(item) ? columns.map((column) => item[column]) : columns.map((column) => (column === 'value' ? item : undefined)),
      ),
    }),
  }
}

function convertObjectToTable(value: JsonRecord): JsonMarkdownTableResult {
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
    output: createMarkdownTable({
      headers: ['key', 'value'],
      rows: entries,
    }),
  }
}

function convertPrimitiveToTable(value: unknown): JsonMarkdownTableResult {
  return {
    ok: true,
    output: createMarkdownTable({
      headers: ['value'],
      rows: [[value]],
    }),
  }
}

function isArrayOfRecords(value: unknown): value is JsonRecord[] {
  return Array.isArray(value) && value.length > 0 && value.every(isJsonRecord)
}

function formatFlattenedArray(value: unknown[]) {
  if (value.length === 0) {
    return '[]'
  }

  if (value.every(isPlainCellValue)) {
    return value.map(stringifyCellValue).join('\n')
  }

  return JSON.stringify(value)
}

function flattenValueIntoRecord(record: JsonRecord, value: unknown, path: string, options: FlattenRecordOptions) {
  if (isJsonRecord(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      record[path] = '{}'
      return
    }

    entries.forEach(([key, childValue]) => {
      flattenValueIntoRecord(record, childValue, path ? `${path}.${key}` : key, options)
    })
    return
  }

  if (Array.isArray(value)) {
    if (options.summarizeArrayRecords && isArrayOfRecords(value)) {
      record[path] = formatArrayRecordCount(value)
      return
    }

    if ((options.arrayMode ?? 'indexed') === 'joined') {
      record[path] = formatFlattenedArray(value)
      return
    }

    if (value.length === 0) {
      record[path] = '[]'
      return
    }

    value.forEach((childValue, index) => {
      flattenValueIntoRecord(record, childValue, `${path}[${index}]`, options)
    })
    return
  }

  record[path || 'value'] = value
}

function flattenValueToRecord(value: unknown, rootPath = 'value', options: FlattenRecordOptions = {}): JsonRecord {
  const record: JsonRecord = {}

  flattenValueIntoRecord(record, value, rootPath, options)

  return record
}

function flattenRecord(value: JsonRecord, parentPath = '', options: FlattenRecordOptions = {}): JsonRecord {
  const record: JsonRecord = {}

  flattenValueIntoRecord(record, value, parentPath, options)

  return record
}

function convertFlattenedArrayToTable(value: unknown[]): JsonMarkdownTableResult {
  if (value.length === 0) {
    return {
      ok: false,
      output: '',
      issue: createIssue('JSON 陣列沒有可轉換的資料列。'),
    }
  }

  const records = value.map((item) => (isJsonRecord(item) ? flattenRecord(item) : flattenValueToRecord(item)))
  const columns = collectRecordColumns(records)

  if (columns.length === 0) {
    return {
      ok: false,
      output: '',
      issue: createIssue('JSON 陣列中的物件沒有欄位。'),
    }
  }

  return {
    ok: true,
    output: createMarkdownTable({
      headers: columns,
      rows: records.map((record) => columns.map((column) => record[column])),
    }),
  }
}

function convertFlattenedObjectToTable(value: JsonRecord): JsonMarkdownTableResult {
  const record = flattenRecord(value)
  const columns = Object.keys(record)

  if (columns.length === 0) {
    return {
      ok: false,
      output: '',
      issue: createIssue('JSON 物件沒有可轉換的欄位。'),
    }
  }

  return {
    ok: true,
    output: createMarkdownTable({
      headers: columns,
      rows: [columns.map((column) => record[column])],
    }),
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

function createMultiTableRecord(value: JsonRecord) {
  return flattenRecord(value, '', { arrayMode: 'joined', summarizeArrayRecords: true })
}

function collectChildTables(value: JsonRecord, parentPath: string, tables: MarkdownTable[], rowIndex?: number) {
  const currentPath = rowIndex === undefined ? parentPath : `${parentPath}[${rowIndex}]`

  Object.entries(value).forEach(([key, childValue]) => {
    const childPath = currentPath === 'root' ? key : `${currentPath}.${key}`

    if (isArrayOfRecords(childValue)) {
      collectMultiTablesFromArray(childValue, childPath, tables)
      return
    }

    if (isJsonRecord(childValue)) {
      collectChildTables(childValue, childPath, tables)
    }
  })
}

function collectMultiTablesFromArray(value: unknown[], title: string, tables: MarkdownTable[]) {
  const records = value.map((item) => (isJsonRecord(item) ? createMultiTableRecord(item) : { value: item }))
  const columns = collectRecordColumns(records)

  if (columns.length === 0) {
    return
  }

  tables.push({
    title,
    headers: columns,
    rows: records.map((record) => columns.map((column) => record[column])),
  })

  value.forEach((item, rowIndex) => {
    if (isJsonRecord(item)) {
      collectChildTables(item, title, tables, rowIndex)
    }
  })
}

function collectMultiTablesFromObject(value: JsonRecord, tables: MarkdownTable[]) {
  const record = createMultiTableRecord(value)
  const columns = Object.keys(record)

  if (columns.length > 0) {
    tables.push({
      title: 'root',
      headers: columns,
      rows: [columns.map((column) => record[column])],
    })
  }

  collectChildTables(value, 'root', tables)
}

function convertMultiTableValue(value: unknown): JsonMarkdownTableResult {
  const tables: MarkdownTable[] = []

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return {
        ok: false,
        output: '',
        issue: createIssue('JSON 陣列沒有可轉換的資料列。'),
      }
    }

    collectMultiTablesFromArray(value, 'root', tables)
  } else if (isJsonRecord(value)) {
    collectMultiTablesFromObject(value, tables)
  } else {
    return convertPrimitiveToTable(value)
  }

  if (tables.length === 0) {
    return {
      ok: false,
      output: '',
      issue: createIssue('JSON 沒有可轉換的表格資料。'),
    }
  }

  return {
    ok: true,
    output: createMarkdownTableDocument(tables),
  }
}

function convertParsedValueToMarkdownTable(value: unknown, mode: JsonMarkdownTableMode): JsonMarkdownTableResult {
  if (mode === 'flatten') {
    if (Array.isArray(value)) {
      return convertFlattenedArrayToTable(value)
    }

    if (isJsonRecord(value)) {
      return convertFlattenedObjectToTable(value)
    }

    return convertPrimitiveToTable(value)
  }

  if (mode === 'multi-table') {
    return convertMultiTableValue(value)
  }

  if (Array.isArray(value)) {
    return convertArrayToTable(value)
  }

  if (isJsonRecord(value)) {
    return convertObjectToTable(value)
  }

  return convertPrimitiveToTable(value)
}

export function convertJsonToMarkdownTable(
  source: string,
  options: JsonMarkdownTableOptions = {},
): JsonMarkdownTableResult {
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

  return convertParsedValueToMarkdownTable(result.value, options.mode ?? 'conservative')
}

export function getMarkdownTableStats(markdown: string): JsonMarkdownTableStats {
  const tableBlocks = markdown.split(/\r\n|\r|\n/).reduce<string[][]>((blocks, line) => {
    const trimmedLine = line.trim()
    const currentBlock = blocks[blocks.length - 1]

    if (!trimmedLine.startsWith('|')) {
      if (currentBlock?.length === 0) {
        blocks.pop()
      }

      blocks.push([])
      return blocks
    }

    if (!currentBlock) {
      blocks.push([trimmedLine])
      return blocks
    }

    currentBlock.push(trimmedLine)
    return blocks
  }, []).filter((block) => block.length > 0)

  if (tableBlocks.length === 0) {
    return {
      columns: 0,
      rows: 0,
    }
  }

  const tableStats = tableBlocks.map((rows) => {
    const separatorIndex = rows.findIndex((line) => /^\|\s*:?-+/.test(line))

    return {
      columns: countMarkdownTableCells(rows[0]),
      rows: separatorIndex >= 0 ? Math.max(0, rows.length - separatorIndex - 1) : Math.max(0, rows.length - 1),
    }
  })

  return {
    columns: Math.max(...tableStats.map((stats) => stats.columns)),
    rows: tableStats.reduce((totalRows, stats) => totalRows + stats.rows, 0),
  }
}
