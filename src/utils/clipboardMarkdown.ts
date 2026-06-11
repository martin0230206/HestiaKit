import TurndownService from 'turndown'
import { strikethrough, taskListItems } from 'turndown-plugin-gfm'

export interface ClipboardMarkdownInput {
  html: string
  plainText: string
}

export interface MarkdownDocumentStats {
  characters: number
  words: number
  lines: number
}

export interface ClipboardMarkdownTransformResult {
  ok: boolean
  output: string
  issue?: string
}

const removableBlockPattern = /<(script|style|meta|link|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi
const removableVoidPattern = /<(script|style|meta|link)\b[^>]*\/?>/gi
const htmlAttributePattern = /\s(?:class|style|id|data-[\w-]+|aria-[\w-]+)=("[^"]*"|'[^']*'|[^\s>]+)/gi
const inlineEventAttributePattern = /\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi
const tableBreakMarker = '\uE000'

function sanitizeHtmlWithDomParser(html: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  document.querySelectorAll('script, style, meta, link, noscript, template').forEach((node) => node.remove())

  document.body.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (
        attribute.name === 'class' ||
        attribute.name === 'style' ||
        attribute.name === 'id' ||
        attribute.name.startsWith('data-') ||
        attribute.name.startsWith('aria-') ||
        attribute.name.startsWith('on')
      ) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  return document.body.innerHTML
}

export function sanitizeHtmlForMarkdown(html: string) {
  const trimmedHtml = html.trim()

  if (!trimmedHtml) {
    return ''
  }

  if (typeof DOMParser === 'function') {
    return sanitizeHtmlWithDomParser(trimmedHtml)
  }

  return trimmedHtml
    .replace(removableBlockPattern, '')
    .replace(removableVoidPattern, '')
    .replace(inlineEventAttributePattern, '')
    .replace(htmlAttributePattern, '')
}

export function normalizeMarkdown(markdown: string) {
  return markdown
    .replace(/\r\n|\r/g, '\n')
    .replace(/^([ \t]*[-+*]) {2,}/gm, '$1 ')
    .replace(/^([ \t]*\d+\.) {2,}/gm, '$1 ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function createBaseMarkdownConverter() {
  return new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    strongDelimiter: '**',
    emDelimiter: '*',
    linkStyle: 'inlined',
  })
}

function getTableCells(row: HTMLTableRowElement) {
  return Array.from(row.cells).flatMap((cell) => {
    const colSpan = Math.max(1, cell.colSpan || 1)
    return [cell, ...Array.from({ length: colSpan - 1 }, () => undefined)]
  })
}

function hasExplicitHeadingRow(table: HTMLTableElement) {
  const firstRow = table.rows[0]

  if (!firstRow) {
    return false
  }

  return (
    firstRow.parentElement?.tagName.toLowerCase() === 'thead' ||
    Array.from(firstRow.cells).some((cell) => cell.tagName.toLowerCase() === 'th')
  )
}

function normalizeTableCellMarkdown(markdown: string) {
  return normalizeMarkdown(markdown)
    .replace(new RegExp(tableBreakMarker, 'g'), '<br>')
    .replace(/\n+/g, '<br>')
    .replace(/\\([\\`*_{}[\]()#+.!-])/g, '$1')
    .replace(/\|/g, '\\|')
}

function convertTableCellToMarkdown(cell: HTMLTableCellElement | undefined) {
  if (!cell) {
    return ''
  }

  const cellHtml = cell.innerHTML.replace(/<br\s*\/?>/gi, tableBreakMarker)
  const markdown = createBaseMarkdownConverter().turndown(cellHtml)

  return normalizeTableCellMarkdown(markdown)
}

function createMarkdownTable(table: HTMLTableElement) {
  const rows = Array.from(table.rows)

  if (rows.length === 0) {
    return ''
  }

  const tableRows = rows.map(getTableCells)
  const columnCount = Math.max(...tableRows.map((row) => row.length))
  const hasHeadingRow = hasExplicitHeadingRow(table)
  const headerCells = hasHeadingRow ? tableRows[0] : Array.from({ length: columnCount }, () => undefined)
  const bodyRows = hasHeadingRow ? tableRows.slice(1) : tableRows
  const formatRow = (row: Array<HTMLTableCellElement | undefined>) =>
    `| ${Array.from({ length: columnCount }, (_, index) => convertTableCellToMarkdown(row[index])).join(' | ')} |`
  const separatorRow = `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`

  return `\n\n${[formatRow(headerCells), separatorRow, ...bodyRows.map(formatRow)].join('\n')}\n\n`
}

export function createMarkdownConverter() {
  const turndownService = createBaseMarkdownConverter()

  turndownService.use([strikethrough, taskListItems])
  turndownService.addRule('spreadsheetTables', {
    filter: 'table',
    replacement: (_content, node) => createMarkdownTable(node as HTMLTableElement),
  })

  return turndownService
}

export function convertHtmlToMarkdown(html: string): ClipboardMarkdownTransformResult {
  try {
    const sanitizedHtml = sanitizeHtmlForMarkdown(html)

    if (!sanitizedHtml) {
      return {
        ok: true,
        output: '',
      }
    }

    return {
      ok: true,
      output: normalizeMarkdown(createMarkdownConverter().turndown(sanitizedHtml)),
    }
  } catch (error) {
    return {
      ok: false,
      output: '',
      issue: error instanceof Error ? error.message : '無法轉換 HTML。',
    }
  }
}

export function convertClipboardInputToMarkdown(input: ClipboardMarkdownInput): ClipboardMarkdownTransformResult {
  if (input.html.trim()) {
    return convertHtmlToMarkdown(input.html)
  }

  return {
    ok: true,
    output: normalizeMarkdown(input.plainText),
  }
}

export function getMarkdownDocumentStats(source: string): MarkdownDocumentStats {
  const trimmedSource = source.trim()
  const words = trimmedSource ? trimmedSource.split(/\s+/).length : 0

  return {
    characters: source.length,
    words,
    lines: source ? source.split(/\r\n|\r|\n/).length : 1,
  }
}
