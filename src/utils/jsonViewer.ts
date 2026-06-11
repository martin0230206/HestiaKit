export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type JsonParseResult =
  | {
      ok: true
      value: JsonValue
    }
  | {
      ok: false
      message: string
      position?: number
      line?: number
      column?: number
    }

export type JsonStats = {
  objects: number
  arrays: number
  keys: number
  values: number
  strings: number
  numbers: number
  booleans: number
  nulls: number
  maxDepth: number
}

const emptyStats: JsonStats = {
  objects: 0,
  arrays: 0,
  keys: 0,
  values: 0,
  strings: 0,
  numbers: 0,
  booleans: 0,
  nulls: 0,
  maxDepth: 0,
}

export function parseJson(source: string): JsonParseResult {
  if (!source.trim()) {
    return {
      ok: false,
      message: '請輸入 JSON 內容。',
    }
  }

  try {
    return {
      ok: true,
      value: JSON.parse(source) as JsonValue,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON 格式無效。'
    const position = getErrorPosition(message)
    const location = typeof position === 'number' ? getLineColumn(source, position) : undefined

    return {
      ok: false,
      message,
      position,
      line: location?.line,
      column: location?.column,
    }
  }
}

export function formatJson(value: JsonValue, indentation = 2) {
  return JSON.stringify(value, null, indentation)
}

export function minifyJson(value: JsonValue) {
  return JSON.stringify(value)
}

export function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
      .sort((firstKey, secondKey) => firstKey.localeCompare(secondKey))
      .reduce<Record<string, JsonValue>>((sorted, key) => {
        sorted[key] = sortJsonValue(value[key])
        return sorted
      }, {})
  }

  return value
}

export function getJsonStats(value: JsonValue): JsonStats {
  const stats = { ...emptyStats }

  collectStats(value, stats, 1)

  return stats
}

function collectStats(value: JsonValue, stats: JsonStats, depth: number) {
  stats.values += 1
  stats.maxDepth = Math.max(stats.maxDepth, depth)

  if (Array.isArray(value)) {
    stats.arrays += 1
    value.forEach((item) => collectStats(item, stats, depth + 1))
    return
  }

  if (value === null) {
    stats.nulls += 1
    return
  }

  if (typeof value === 'object') {
    stats.objects += 1
    const entries = Object.entries(value)
    stats.keys += entries.length
    entries.forEach(([, item]) => collectStats(item, stats, depth + 1))
    return
  }

  if (typeof value === 'string') {
    stats.strings += 1
  } else if (typeof value === 'number') {
    stats.numbers += 1
  } else {
    stats.booleans += 1
  }
}

function getErrorPosition(message: string) {
  const positionMatch = /position\s+(\d+)/i.exec(message)

  if (!positionMatch) {
    return undefined
  }

  return Number.parseInt(positionMatch[1], 10)
}

function getLineColumn(source: string, position: number) {
  const textBeforeError = source.slice(0, position)
  const lines = textBeforeError.split(/\r\n|\r|\n/)
  const line = lines.length
  const column = (lines.at(-1)?.length ?? 0) + 1

  return { line, column }
}
