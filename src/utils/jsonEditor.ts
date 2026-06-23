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

export type JsonRepairKind =
  | 'comment'
  | 'literal'
  | 'single-quoted-string'
  | 'smart-quote'
  | 'trailing-comma'
  | 'unquoted-key'

export interface JsonRepairAction {
  kind: JsonRepairKind
  label: string
  count: number
}

export interface JsonRepairResult extends JsonTransformResult {
  actions: JsonRepairAction[]
}

export interface JsonTreeEditResult extends JsonTransformResult {
  value?: unknown
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

const jsonRepairActionOrder: JsonRepairKind[] = [
  'comment',
  'trailing-comma',
  'single-quoted-string',
  'smart-quote',
  'unquoted-key',
  'literal',
]

const jsonRepairLabels: Record<JsonRepairKind, string> = {
  comment: '移除 JavaScript 註解',
  literal: '轉換非 JSON literal',
  'single-quoted-string': '將單引號字串改成雙引號',
  'smart-quote': '將智慧引號改成標準雙引號',
  'trailing-comma': '移除結尾逗號',
  'unquoted-key': '補上未加引號的 key',
}

const nonJsonLiteralReplacements: Record<string, string> = {
  FALSE: 'false',
  False: 'false',
  NULL: 'null',
  None: 'null',
  TRUE: 'true',
  True: 'true',
  Undefined: 'null',
  undefined: 'null',
}

function recordJsonRepair(counts: Map<JsonRepairKind, number>, kind: JsonRepairKind) {
  counts.set(kind, (counts.get(kind) ?? 0) + 1)
}

function getJsonRepairActions(counts: ReadonlyMap<JsonRepairKind, number>): JsonRepairAction[] {
  return jsonRepairActionOrder.flatMap((kind) => {
    const count = counts.get(kind) ?? 0

    return count > 0
      ? [
          {
            kind,
            label: jsonRepairLabels[kind],
            count,
          },
        ]
      : []
  })
}

function isJsonWhitespace(char: string | undefined) {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t'
}

function skipJsonWhitespace(source: string, startIndex: number) {
  let index = startIndex

  while (isJsonWhitespace(source[index])) {
    index += 1
  }

  return index
}

function isIdentifierStart(char: string | undefined) {
  return Boolean(char && /[A-Za-z_$]/.test(char))
}

function isIdentifierPart(char: string | undefined) {
  return Boolean(char && /[A-Za-z0-9_$-]/.test(char))
}

function isSmartSingleQuote(char: string | undefined) {
  return char === '‘' || char === '’'
}

function isSmartDoubleQuote(char: string | undefined) {
  return char === '“' || char === '”'
}

function copyDoubleQuotedString(source: string, startIndex: number) {
  let output = source[startIndex]
  let index = startIndex + 1

  while (index < source.length) {
    const char = source[index]
    output += char

    if (char === '\\' && index + 1 < source.length) {
      index += 1
      output += source[index]
      index += 1
      continue
    }

    if (char === '"') {
      return {
        endIndex: index,
        output,
      }
    }

    index += 1
  }

  return {
    endIndex: source.length - 1,
    output,
  }
}

function isRepairableQuoteEnd(char: string | undefined, quoteKind: 'single' | 'smart-double' | 'smart-single') {
  if (quoteKind === 'smart-double') {
    return isSmartDoubleQuote(char)
  }

  if (quoteKind === 'smart-single') {
    return char === "'" || isSmartSingleQuote(char)
  }

  return char === "'"
}

function repairQuotedString(
  source: string,
  startIndex: number,
  quoteKind: 'single' | 'smart-double' | 'smart-single',
) {
  let output = '"'
  let index = startIndex + 1

  while (index < source.length) {
    const char = source[index]

    if (char === '\\') {
      const nextChar = source[index + 1]

      if (nextChar === undefined) {
        return {
          endIndex: source.length - 1,
          output: source.slice(startIndex),
          repaired: false,
        }
      }

      if (quoteKind !== 'smart-double' && (nextChar === "'" || isSmartSingleQuote(nextChar))) {
        output += nextChar === "'" ? "'" : nextChar
        index += 2
        continue
      }

      output += `\\${nextChar}`
      index += 2
      continue
    }

    if (isRepairableQuoteEnd(char, quoteKind)) {
      output += '"'

      return {
        endIndex: index,
        output,
        repaired: true,
      }
    }

    if (char === '"') {
      output += '\\"'
      index += 1
      continue
    }

    if (char === '\r') {
      output += '\\n'
      index += source[index + 1] === '\n' ? 2 : 1
      continue
    }

    if (char === '\n') {
      output += '\\n'
      index += 1
      continue
    }

    output += char
    index += 1
  }

  return {
    endIndex: source.length - 1,
    output: source.slice(startIndex),
    repaired: false,
  }
}

function removeJsonLikeCommentsAndNormalizeQuotes(source: string, counts: Map<JsonRepairKind, number>) {
  let output = ''
  let index = 0

  while (index < source.length) {
    const char = source[index]
    const nextChar = source[index + 1]

    if (char === '\uFEFF' && output.length === 0) {
      index += 1
      continue
    }

    if (char === '"') {
      const quotedString = copyDoubleQuotedString(source, index)
      output += quotedString.output
      index = quotedString.endIndex + 1
      continue
    }

    if (char === "'" || isSmartSingleQuote(char) || isSmartDoubleQuote(char)) {
      const quoteKind = char === "'" ? 'single' : isSmartDoubleQuote(char) ? 'smart-double' : 'smart-single'
      const quotedString = repairQuotedString(source, index, quoteKind)

      output += quotedString.output

      if (quotedString.repaired) {
        recordJsonRepair(counts, quoteKind === 'single' ? 'single-quoted-string' : 'smart-quote')
      }

      index = quotedString.endIndex + 1
      continue
    }

    if (char === '/' && nextChar === '/') {
      recordJsonRepair(counts, 'comment')
      index += 2

      while (index < source.length && source[index] !== '\n' && source[index] !== '\r') {
        index += 1
      }

      continue
    }

    if (char === '/' && nextChar === '*') {
      recordJsonRepair(counts, 'comment')
      index += 2

      while (index < source.length) {
        const blockChar = source[index]

        if (blockChar === '*' && source[index + 1] === '/') {
          index += 2
          break
        }

        if (blockChar === '\r') {
          output += blockChar

          if (source[index + 1] === '\n') {
            output += '\n'
            index += 2
          } else {
            index += 1
          }

          continue
        }

        if (blockChar === '\n') {
          output += blockChar
        }

        index += 1
      }

      continue
    }

    output += char
    index += 1
  }

  return output
}

function repairLooseJsonTokens(source: string, counts: Map<JsonRepairKind, number>) {
  let output = ''
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (char === '"') {
      const quotedString = copyDoubleQuotedString(source, index)
      output += quotedString.output
      index = quotedString.endIndex + 1
      continue
    }

    if (char === ',') {
      const nextTokenIndex = skipJsonWhitespace(source, index + 1)
      const nextToken = source[nextTokenIndex]

      if (nextToken === '}' || nextToken === ']') {
        recordJsonRepair(counts, 'trailing-comma')
        index += 1
        continue
      }

      output += char
      index += 1
      continue
    }

    if (isIdentifierStart(char)) {
      const startIndex = index

      while (isIdentifierPart(source[index])) {
        index += 1
      }

      const token = source.slice(startIndex, index)
      const nextTokenIndex = skipJsonWhitespace(source, index)

      if (source[nextTokenIndex] === ':') {
        output += JSON.stringify(token)
        recordJsonRepair(counts, 'unquoted-key')
        continue
      }

      if (Object.hasOwn(nonJsonLiteralReplacements, token)) {
        output += nonJsonLiteralReplacements[token]
        recordJsonRepair(counts, 'literal')
        continue
      }

      output += token
      continue
    }

    output += char
    index += 1
  }

  return output
}

function buildJsonRepairCandidate(source: string) {
  const counts = new Map<JsonRepairKind, number>()
  const withoutComments = removeJsonLikeCommentsAndNormalizeQuotes(source, counts)
  const output = repairLooseJsonTokens(withoutComments, counts)

  return {
    actions: getJsonRepairActions(counts),
    output,
  }
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

function decodeJsonTreePath(path: string): string[] | undefined {
  if (path === '$') {
    return []
  }

  if (!path.startsWith('$/')) {
    return undefined
  }

  return path
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
}

function getPathIssue(path: string): JsonParseIssue {
  return {
    message: `無法定位 JSON 節點：${path}`,
  }
}

function getDuplicateKeyIssue(key: string): JsonParseIssue {
  return {
    message: `key "${key}" 已存在。`,
  }
}

function getRootDeleteIssue(): JsonParseIssue {
  return {
    message: 'root 節點不可刪除。',
  }
}

function getContainerIssue(path: string): JsonParseIssue {
  return {
    message: `節點不是可新增項目的 object 或 array：${path}`,
  }
}

function createDefaultObjectKey(objectValue: Record<string, unknown>) {
  const baseKey = 'newKey'

  if (!Object.hasOwn(objectValue, baseKey)) {
    return baseKey
  }

  let index = 1
  let nextKey = `${baseKey}${index}`

  while (Object.hasOwn(objectValue, nextKey)) {
    index += 1
    nextKey = `${baseKey}${index}`
  }

  return nextKey
}

function updateValueAtPath(value: unknown, pathSegments: string[], nextValue: unknown): JsonTreeEditResult {
  if (pathSegments.length === 0) {
    return {
      ok: true,
      value: nextValue,
    }
  }

  const [currentSegment, ...childSegments] = pathSegments

  if (Array.isArray(value)) {
    const index = Number(currentSegment)

    if (!Number.isInteger(index) || index < 0 || index >= value.length) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    const childResult = updateValueAtPath(value[index], childSegments, nextValue)

    if (!childResult.ok) {
      return childResult
    }

    const nextArray = [...value]
    nextArray[index] = childResult.value

    return {
      ok: true,
      value: nextArray,
    }
  }

  if (value !== null && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>

    if (!Object.hasOwn(objectValue, currentSegment)) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    const childResult = updateValueAtPath(objectValue[currentSegment], childSegments, nextValue)

    if (!childResult.ok) {
      return childResult
    }

    return {
      ok: true,
      value: {
        ...objectValue,
        [currentSegment]: childResult.value,
      },
    }
  }

  return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
}

function addItemAtPath(value: unknown, pathSegments: string[], nextValue: unknown): JsonTreeEditResult {
  if (pathSegments.length === 0) {
    if (Array.isArray(value)) {
      return {
        ok: true,
        value: [...value, nextValue],
      }
    }

    if (value !== null && typeof value === 'object') {
      const objectValue = value as Record<string, unknown>
      const nextKey = createDefaultObjectKey(objectValue)

      return {
        ok: true,
        value: {
          ...objectValue,
          [nextKey]: nextValue,
        },
      }
    }

    return { ok: false, issue: getContainerIssue('$') }
  }

  const [currentSegment, ...childSegments] = pathSegments

  if (Array.isArray(value)) {
    const index = Number(currentSegment)

    if (!Number.isInteger(index) || index < 0 || index >= value.length) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    const childResult = addItemAtPath(value[index], childSegments, nextValue)

    if (!childResult.ok) {
      return childResult
    }

    const nextArray = [...value]
    nextArray[index] = childResult.value

    return {
      ok: true,
      value: nextArray,
    }
  }

  if (value !== null && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>

    if (!Object.hasOwn(objectValue, currentSegment)) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    const childResult = addItemAtPath(objectValue[currentSegment], childSegments, nextValue)

    if (!childResult.ok) {
      return childResult
    }

    return {
      ok: true,
      value: {
        ...objectValue,
        [currentSegment]: childResult.value,
      },
    }
  }

  return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
}

function deleteItemAtPath(value: unknown, pathSegments: string[]): JsonTreeEditResult {
  if (pathSegments.length === 0) {
    return {
      ok: false,
      issue: getRootDeleteIssue(),
    }
  }

  const [currentSegment, ...childSegments] = pathSegments

  if (Array.isArray(value)) {
    const index = Number(currentSegment)

    if (!Number.isInteger(index) || index < 0 || index >= value.length) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    if (childSegments.length === 0) {
      return {
        ok: true,
        value: value.filter((_, childIndex) => childIndex !== index),
      }
    }

    const childResult = deleteItemAtPath(value[index], childSegments)

    if (!childResult.ok) {
      return childResult
    }

    const nextArray = [...value]
    nextArray[index] = childResult.value

    return {
      ok: true,
      value: nextArray,
    }
  }

  if (value !== null && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>

    if (!Object.hasOwn(objectValue, currentSegment)) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    if (childSegments.length === 0) {
      return {
        ok: true,
        value: Object.entries(objectValue).reduce<Record<string, unknown>>((nextObject, [key, childValue]) => {
          if (key !== currentSegment) {
            nextObject[key] = childValue
          }

          return nextObject
        }, {}),
      }
    }

    const childResult = deleteItemAtPath(objectValue[currentSegment], childSegments)

    if (!childResult.ok) {
      return childResult
    }

    return {
      ok: true,
      value: {
        ...objectValue,
        [currentSegment]: childResult.value,
      },
    }
  }

  return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
}

function renameKeyAtPath(value: unknown, pathSegments: string[], nextKey: string): JsonTreeEditResult {
  if (pathSegments.length === 0) {
    return {
      ok: false,
      issue: {
        message: 'root 節點沒有可編輯的 key。',
      },
    }
  }

  const [currentSegment, ...childSegments] = pathSegments

  if (Array.isArray(value)) {
    const index = Number(currentSegment)

    if (!Number.isInteger(index) || index < 0 || index >= value.length) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    const childResult = renameKeyAtPath(value[index], childSegments, nextKey)

    if (!childResult.ok) {
      return childResult
    }

    const nextArray = [...value]
    nextArray[index] = childResult.value

    return {
      ok: true,
      value: nextArray,
    }
  }

  if (value !== null && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>

    if (!Object.hasOwn(objectValue, currentSegment)) {
      return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
    }

    if (childSegments.length > 0) {
      const childResult = renameKeyAtPath(objectValue[currentSegment], childSegments, nextKey)

      if (!childResult.ok) {
        return childResult
      }

      return {
        ok: true,
        value: {
          ...objectValue,
          [currentSegment]: childResult.value,
        },
      }
    }

    if (nextKey !== currentSegment && Object.hasOwn(objectValue, nextKey)) {
      return {
        ok: false,
        issue: getDuplicateKeyIssue(nextKey),
      }
    }

    return {
      ok: true,
      value: Object.entries(objectValue).reduce<Record<string, unknown>>((renamedObject, [key, childValue]) => {
        renamedObject[key === currentSegment ? nextKey : key] = childValue
        return renamedObject
      }, {}),
    }
  }

  return { ok: false, issue: getPathIssue(`$/${pathSegments.join('/')}`) }
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

export function parseJsonEditableValue(source: string): unknown {
  const trimmedSource = source.trim()

  if (!trimmedSource) {
    return ''
  }

  try {
    return JSON.parse(trimmedSource)
  } catch {
    return source
  }
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

export function repairJsonDocument(source: string, spaces = 2): JsonRepairResult {
  const candidate = buildJsonRepairCandidate(source)

  if (candidate.actions.length === 0) {
    return {
      ok: false,
      actions: [],
      issue: parseJsonDocument(source).issue ?? {
        message: '未找到可自動修復的常見 JSON 錯誤。',
      },
    }
  }

  const result = parseJsonDocument(candidate.output)

  if (!result.ok) {
    return {
      ok: false,
      actions: candidate.actions,
      issue: result.issue,
    }
  }

  return {
    ok: true,
    actions: candidate.actions,
    output: JSON.stringify(result.value, null, spaces),
  }
}

export function updateJsonDocumentValue(source: string, path: string, nextValue: unknown, spaces = 2): JsonTransformResult {
  const result = parseJsonDocument(source)
  const pathSegments = decodeJsonTreePath(path)

  if (!result.ok) {
    return { ok: false, issue: result.issue }
  }

  if (!pathSegments) {
    return { ok: false, issue: getPathIssue(path) }
  }

  const editResult = updateValueAtPath(result.value, pathSegments, nextValue)

  if (!editResult.ok) {
    return { ok: false, issue: editResult.issue }
  }

  return {
    ok: true,
    output: JSON.stringify(editResult.value, null, spaces),
  }
}

export function updateJsonDocumentKey(source: string, path: string, nextKey: string, spaces = 2): JsonTransformResult {
  const result = parseJsonDocument(source)
  const pathSegments = decodeJsonTreePath(path)

  if (!result.ok) {
    return { ok: false, issue: result.issue }
  }

  if (!pathSegments) {
    return { ok: false, issue: getPathIssue(path) }
  }

  const editResult = renameKeyAtPath(result.value, pathSegments, nextKey)

  if (!editResult.ok) {
    return { ok: false, issue: editResult.issue }
  }

  return {
    ok: true,
    output: JSON.stringify(editResult.value, null, spaces),
  }
}

export function addJsonDocumentItem(source: string, path: string, nextValue: unknown = null, spaces = 2): JsonTransformResult {
  const result = parseJsonDocument(source)
  const pathSegments = decodeJsonTreePath(path)

  if (!result.ok) {
    return { ok: false, issue: result.issue }
  }

  if (!pathSegments) {
    return { ok: false, issue: getPathIssue(path) }
  }

  const editResult = addItemAtPath(result.value, pathSegments, nextValue)

  if (!editResult.ok) {
    return { ok: false, issue: editResult.issue }
  }

  return {
    ok: true,
    output: JSON.stringify(editResult.value, null, spaces),
  }
}

export function deleteJsonDocumentItem(source: string, path: string, spaces = 2): JsonTransformResult {
  const result = parseJsonDocument(source)
  const pathSegments = decodeJsonTreePath(path)

  if (!result.ok) {
    return { ok: false, issue: result.issue }
  }

  if (!pathSegments) {
    return { ok: false, issue: getPathIssue(path) }
  }

  const editResult = deleteItemAtPath(result.value, pathSegments)

  if (!editResult.ok) {
    return { ok: false, issue: editResult.issue }
  }

  return {
    ok: true,
    output: JSON.stringify(editResult.value, null, spaces),
  }
}

export function getJsonDocumentStats(source: string): JsonDocumentStats {
  return {
    characters: source.length,
    lines: source ? source.split(/\r\n|\r|\n/).length : 1,
  }
}
