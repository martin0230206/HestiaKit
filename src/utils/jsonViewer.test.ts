import { describe, expect, it } from 'vitest'
import { formatJson, getJsonStats, minifyJson, parseJson, sortJsonValue } from './jsonViewer'

describe('jsonViewer', () => {
  it('parses valid JSON', () => {
    const result = parseJson('{"name":"HestiaKit","enabled":true}')

    expect(result.ok).toBe(true)
  })

  it('reports invalid JSON with a message', () => {
    const result = parseJson('{"name":}')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.message).toBeTruthy()
    }
  })

  it('formats and minifies JSON values', () => {
    const value = { name: 'HestiaKit', tags: ['json', 'tools'] }

    expect(formatJson(value)).toContain('\n  "name"')
    expect(minifyJson(value)).toBe('{"name":"HestiaKit","tags":["json","tools"]}')
  })

  it('sorts object keys recursively', () => {
    const sorted = sortJsonValue({
      z: 1,
      a: {
        y: true,
        b: null,
      },
    })

    expect(Object.keys(sorted as Record<string, unknown>)).toEqual(['a', 'z'])
    expect(Object.keys((sorted as Record<string, Record<string, unknown>>).a)).toEqual(['b', 'y'])
  })

  it('collects structural statistics', () => {
    const stats = getJsonStats({
      name: 'HestiaKit',
      items: [1, true, null],
    })

    expect(stats.objects).toBe(1)
    expect(stats.arrays).toBe(1)
    expect(stats.keys).toBe(2)
    expect(stats.values).toBe(6)
    expect(stats.maxDepth).toBe(3)
  })
})
