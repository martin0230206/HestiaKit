import { describe, expect, it } from 'vitest'
import {
  addJsonDocumentItem,
  collectExpandableJsonPaths,
  compactJsonDocument,
  deleteJsonDocumentItem,
  formatJsonDocument,
  getJsonDocumentStats,
  parseJsonEditableValue,
  parseJsonDocument,
  sortJsonDocumentKeys,
  updateJsonDocumentKey,
  updateJsonDocumentValue,
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

  it('infers editable value types from JSON literal input', () => {
    expect(parseJsonEditableValue('123')).toBe(123)
    expect(parseJsonEditableValue('true')).toBe(true)
    expect(parseJsonEditableValue('null')).toBeNull()
    expect(parseJsonEditableValue('{"enabled":true}')).toEqual({ enabled: true })
    expect(parseJsonEditableValue('[1,2]')).toEqual([1, 2])
    expect(parseJsonEditableValue('HestiaKit')).toBe('HestiaKit')
    expect(parseJsonEditableValue('')).toBe('')
  })

  it('updates a nested object key without changing its value', () => {
    const result = updateJsonDocumentKey('{"settings":{"theme":"system","localOnly":true}}', '$/settings/localOnly', 'private')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "settings": {\n    "theme": "system",\n    "private": true\n  }\n}')
  })

  it('does not overwrite an existing object key when renaming', () => {
    const result = updateJsonDocumentKey('{"theme":"system","private":true}', '$/theme', 'private')

    expect(result.ok).toBe(false)
    expect(result.issue?.message).toContain('已存在')
  })

  it('updates nested primitive values by tree path', () => {
    const result = updateJsonDocumentValue('{"items":[{"enabled":false,"count":1}]}', '$/items/0/count', 3)

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "items": [\n    {\n      "enabled": false,\n      "count": 3\n    }\n  ]\n}')
  })

  it('updates escaped object keys by tree path', () => {
    const result = updateJsonDocumentValue('{"a/b":{"c~d":"old"}}', '$/a~1b/c~0d', 'new')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "a/b": {\n    "c~d": "new"\n  }\n}')
  })

  it('adds a default key to an object node', () => {
    const result = addJsonDocumentItem('{"settings":{"newKey":1}}', '$/settings')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "settings": {\n    "newKey": 1,\n    "newKey1": null\n  }\n}')
  })

  it('appends a null item to an array node', () => {
    const result = addJsonDocumentItem('{"items":[1,2]}', '$/items')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "items": [\n    1,\n    2,\n    null\n  ]\n}')
  })

  it('deletes an object property by tree path', () => {
    const result = deleteJsonDocumentItem('{"settings":{"theme":"system","localOnly":true}}', '$/settings/localOnly')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "settings": {\n    "theme": "system"\n  }\n}')
  })

  it('deletes an array item by tree path', () => {
    const result = deleteJsonDocumentItem('{"items":["first","second","third"]}', '$/items/1')

    expect(result.ok).toBe(true)
    expect(result.output).toBe('{\n  "items": [\n    "first",\n    "third"\n  ]\n}')
  })

  it('does not delete the root node', () => {
    const result = deleteJsonDocumentItem('{"enabled":true}', '$')

    expect(result.ok).toBe(false)
    expect(result.issue?.message).toContain('root')
  })
})
