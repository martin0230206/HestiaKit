import { describe, expect, it } from 'vitest'
import {
  collectExpandableJsonPaths,
  compactJsonDocument,
  formatJsonDocument,
  getJsonDocumentStats,
  parseJsonDocument,
  sortJsonDocumentKeys,
} from './jsonEditor'

describe('jsonEditor', () => {
  it('formats valid JSON with indentation', () => {
    const result = formatJsonDocument('{"name":"HestiaKit","enabled":true}')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "name": "HestiaKit",\n  "enabled": true\n}')
  })

  it('compacts valid JSON', () => {
    const result = compactJsonDocument('{\n  "name": "HestiaKit"\n}')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{"name":"HestiaKit"}')
  })

  it('sorts object keys recursively', () => {
    const result = sortJsonDocumentKeys('{"z":1,"a":{"y":2,"b":3},"items":[{"d":4,"c":5}]}')

    expect(result.ok).toBe(true)
    expect(result.output).toBe(
      '{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "items": [\n    {\n      "c": 5,\n      "d": 4\n    }\n  ],\n  "z": 1\n}',
    )
  })

  it('reports invalid JSON as a parse issue', () => {
    const result = parseJsonDocument('{\n  "name": "HestiaKit",\n}')

    expect(result.ok).toBe(false)
    expect(result.issue?.message).toBeTruthy()
  })

  it('counts document lines and characters', () => {
    expect(getJsonDocumentStats('{\n}')).toEqual({
      characters: 3,
      lines: 2,
    })
  })

  it('collects expandable paths for objects and arrays', () => {
    const paths = collectExpandableJsonPaths({
      items: [{ id: 1 }],
      meta: {
        active: true,
      },
      empty: [],
    })

    expect(paths).toEqual(['$', '$/items', '$/items/0', '$/meta'])
  })
})
