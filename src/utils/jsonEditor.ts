export interface JsonParseIssue {
  message: string
  line?: number
  column?: number
  position?: number
}

export interface JsonParseResult {
  ok: boolean
  value?: unknown
  issue?: JsonParseIssue
}

export interface JsonTransformResult {
  ok: boolean
  output?: string
  issue?: JsonParseIssue
}

export interface JsonDocumentStats {
  characters: number
  lines: number
}

export type JsonValueKind = 'array' | 'object' | 'string' | 'number' | 'boolean' | 'null'

function issueFromSyntaxError(error: SyntaxError, source: string): JsonParseIssue {
  const message = error.message
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  const positionMatch = message.match(/position\s+(\d+)/i)
  const position = positionMatch ? Number(positionMatch[1]) : undefined

  if (lineColumnMatch) {
    return {
      message,
      line: Number(lineColumnMatch[1]),
      column: Number(lineColumnMatch[2]),
      position,
    }
  }

  if (position !== undefined) {
    return {
      message,
      ...getLineColumnFromPosition(source, position),
      position,
    }
  }

  return { message }
}

function getLineColumnFromPosition(source: string, position: number) {
  const beforePosition = source.slice(0, position)
  const lines = beforePosition.split(/\r\n|\r|\n/)
  const line = lines.length
  const column = lines[lines.length - 1].length + 1

  return { line, column }
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((sortedObject, key) => {
        sortedObject[key] = sortValue((value as Record<string, unknown>)[key])
        return sortedObject
      }, {})
  }

  return value
}

function isExpandableValue(value: unknown) {
  return (
    (Array.isArray(value) && value.length > 0) ||
    (value !== null && typeof value === 'object' && Object.keys(value).length > 0)
  )
}

export function getJsonValueKind(value: unknown): JsonValueKind {
  if (Array.isArray(value)) {
    return 'array'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'object') {
    return 'object'
  }

  return typeof value as JsonValueKind
}

export function toJsonTreeChildPath(parentPath: string, key: string | number) {
  return `${parentPath}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`
}

export function collectExpandableJsonPaths(value: unknown, rootPath = '$'): string[] {
  if (!isExpandableValue(value)) {
    return []
  }

  const childEntries = Array.isArray(value)
    ? value.map((childValue, index) => [index, childValue] as const)
    : Object.entries(value as Record<string, unknown>)

  return [
    rootPath,
    ...childEntries.flatMap(([key, childValue]) =>
      collectExpandableJsonPaths(childValue, toJsonTreeChildPath(rootPath, key)),
    ),
  ]
}

export function parseJsonDocument(source: string): JsonParseResult {
  try {
    return {
      ok: true,
      value: JSON.parse(source),
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        ok: false,
        issue: issueFromSyntaxError(error, source),
      }
    }

    return {
      ok: false,
      issue: {
        message: '無法解析 JSON。',
      },
    }
  }
}

export function formatJsonDocument(source: string, spaces = 2): JsonTransformResult {
  const result = parseJsonDocument(source)

  if (!result.ok) {
    return { ok: false, issue: result.issue }
  }

  return {
    ok: true,
    output: JSON.stringify(result.value, null, spaces),
  }
}

export function compactJsonDocument(source: string): JsonTransformResult {
  const result = parseJsonDocument(source)

  if (!result.ok) {
    return { ok: false, issue: result.issue }
  }

  return {
    ok: true,
    output: JSON.stringify(result.value),
  }
}

export function sortJsonDocumentKeys(source: string, spaces = 2): JsonTransformResult {
  const result = parseJsonDocument(source)

  if (!result.ok) {
    return { ok: false, issue: result.issue }
  }

  return {
    ok: true,
    output: JSON.stringify(sortValue(result.value), null, spaces),
  }
}

export function getJsonDocumentStats(source: string): JsonDocumentStats {
  return {
    characters: source.length,
    lines: source ? source.split(/\r\n|\r|\n/).length : 1,
  }
}
