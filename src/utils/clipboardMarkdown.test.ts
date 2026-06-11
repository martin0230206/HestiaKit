import { describe, expect, it } from 'vitest'
import {
  convertClipboardInputToMarkdown,
  convertHtmlToMarkdown,
  getMarkdownDocumentStats,
  normalizeMarkdown,
  sanitizeHtmlForMarkdown,
} from './clipboardMarkdown'

describe('clipboardMarkdown', () => {
  it('converts headings, emphasis, and links to Markdown', () => {
    const result = convertHtmlToMarkdown(
      '<h1>HestiaKit</h1><p><strong>Private</strong> <em>browser</em> tools with <a href="https://example.com">docs</a>.</p>',
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe('# HestiaKit\n\n**Private** *browser* tools with [docs](https://example.com).')
  })

  it('converts unordered and ordered lists', () => {
    const result = convertHtmlToMarkdown('<ul><li>Copy rich text</li><li>Paste here</li></ul><ol><li>Review</li></ol>')

    expect(result.ok).toBe(true)
    expect(result.output).toContain('- Copy rich text')
    expect(result.output).toContain('- Paste here')
    expect(result.output).toContain('1. Review')
  })

  it('supports GitHub Flavored Markdown tables', () => {
    const result = convertHtmlToMarkdown(
      '<table><thead><tr><th>Name</th><th>Ready</th></tr></thead><tbody><tr><td>Clipboard</td><td>Yes</td></tr></tbody></table>',
    )

    expect(result.ok).toBe(true)
    expect(result.output).toContain('| Name | Ready |')
    expect(result.output).toContain('| Clipboard | Yes |')
  })

  it('converts Google Sheets clipboard tables to pipe tables without promoting a data row to heading', () => {
    const result = convertHtmlToMarkdown(
      '<table xmlns="http://www.w3.org/1999/xhtml" cellspacing="0" cellpadding="0" dir="ltr" border="1"><colgroup><col width="85"><col width="109"><col width="88"><col width="119"><col width="396"></colgroup><tbody><tr><td>高</td><td></td><td></td><td>分類 A</td><td>第一段內容，<br>第二段內容<br>第三段內容</td></tr><tr><td>中</td><td></td><td></td><td>分類 B</td><td>1. 第一個步驟<br>2. 第二個步驟</td></tr></tbody></table>',
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '|  |  |  |  |  |\n| --- | --- | --- | --- | --- |\n| 高 |  |  | 分類 A | 第一段內容，<br>第二段內容<br>第三段內容 |\n| 中 |  |  | 分類 B | 1. 第一個步驟<br>2. 第二個步驟 |',
    )
  })

  it('converts Google Sheets clipboard wrapper HTML to a pipe table', () => {
    const result = convertHtmlToMarkdown(
      '<html><body><!--StartFragment--><google-sheets-html-origin><style type="text/css"><!--td {border: 1px solid #cccccc;}br {mso-data-placement:same-cell;}--></style><table xmlns="http://www.w3.org/1999/xhtml" cellspacing="0" cellpadding="0" dir="ltr" border="1" style="table-layout:fixed" data-sheets-root="1"><colgroup><col width="119"/><col width="396"/></colgroup><tbody><tr style="height:21px;"><td style="font-weight:bold;">分類 A</td><td style="white-space:normal;">第一段內容<br/>第二段內容<br/>第三段內容</td></tr><tr style="height:21px;"><td style="font-weight:bold;">分類 B</td><td style="white-space:normal;">1. 第一個步驟<br/>2. 第二個步驟</td></tr></tbody></table></google-sheets-html-origin><!--EndFragment--></body></html>',
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '|  |  |\n| --- | --- |\n| 分類 A | 第一段內容<br>第二段內容<br>第三段內容 |\n| 分類 B | 1. 第一個步驟<br>2. 第二個步驟 |',
    )
  })

  it('converts Excel clipboard HTML to a pipe table without promoting a data row to heading', () => {
    const result = convertHtmlToMarkdown(
      '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta name=Generator content="Microsoft Excel"><link rel=File-List href="file:///local/clip_filelist.xml"><style>td{white-space:nowrap}</style></head><body><table border=0 cellpadding=0 cellspacing=0><tr><td class=xl67>項目</td><td class=xl68>完成率</td></tr><tr><td class=xl69>階段 A</td><td class=xl70 align=right>20%</td></tr><tr><td class=xl69>階段 B</td><td class=xl71 align=right>30%</td></tr></table></body></html>',
    )

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '|  |  |\n| --- | --- |\n| 項目 | 完成率 |\n| 階段 A | 20% |\n| 階段 B | 30% |',
    )
  })

  it('falls back to plain text when no HTML exists', () => {
    const result = convertClipboardInputToMarkdown({
      html: '',
      plainText: 'Plain clipboard text',
    })

    expect(result).toEqual({
      ok: true,
      output: 'Plain clipboard text',
    })
  })

  it('removes non-content HTML before conversion', () => {
    const sanitizedHtml = sanitizeHtmlForMarkdown(
      '<style>.x{color:red}</style><p class="x" style="color:red" onclick="alert(1)">Text</p><script>alert(1)</script>',
    )

    expect(sanitizedHtml).toBe('<p>Text</p>')
  })

  it('normalizes excessive whitespace in Markdown output', () => {
    expect(normalizeMarkdown('\n\nA  \n\n\n\nB\n')).toBe('A\n\nB')
  })

  it('counts Markdown document stats', () => {
    expect(getMarkdownDocumentStats('# Title\n\nTwo words')).toEqual({
      characters: 18,
      words: 4,
      lines: 3,
    })
  })
})
