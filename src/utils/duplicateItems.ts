export interface DuplicateItemsOptions {
  trimItems?: boolean
  ignoreCase?: boolean
  ignoreEmptyItems?: boolean
}

export interface DuplicateItemsStats {
  sourceItems: number
  outputItems: number
  duplicateItems: number
  skippedEmptyItems: number
}

export interface DuplicateItemsResult {
  output: string
  stats: DuplicateItemsStats
}

const lineBreakPattern = /\r\n|\r|\n/

function splitItems(source: string) {
  return source.length === 0 ? [] : source.split(lineBreakPattern)
}

function normalizeItemValue(item: string, trimItems: boolean) {
  return trimItems ? item.trim() : item
}

function normalizeItemKey(item: string, ignoreCase: boolean) {
  return ignoreCase ? item.toLocaleLowerCase() : item
}

export function removeDuplicateItems(
  source: string,
  options: DuplicateItemsOptions = {},
): DuplicateItemsResult {
  const trimItems = options.trimItems ?? true
  const ignoreCase = options.ignoreCase ?? false
  const ignoreEmptyItems = options.ignoreEmptyItems ?? true
  const seenItems = new Set<string>()
  const outputItems: string[] = []
  let duplicateItems = 0
  let skippedEmptyItems = 0

  const sourceItems = splitItems(source)

  sourceItems.forEach((item) => {
    const normalizedValue = normalizeItemValue(item, trimItems)

    if (ignoreEmptyItems && normalizedValue.length === 0) {
      skippedEmptyItems += 1
      return
    }

    const key = normalizeItemKey(normalizedValue, ignoreCase)

    if (seenItems.has(key)) {
      duplicateItems += 1
      return
    }

    seenItems.add(key)
    outputItems.push(normalizedValue)
  })

  return {
    output: outputItems.join('\n'),
    stats: {
      sourceItems: sourceItems.length,
      outputItems: outputItems.length,
      duplicateItems,
      skippedEmptyItems,
    },
  }
}

export function summarizeDuplicateItemsInput(source: string, maxLength = 72) {
  const trimmedSource = source.trim().replace(/\s+/g, ' ')

  if (trimmedSource.length <= maxLength) {
    return trimmedSource || '空白輸入'
  }

  return `${trimmedSource.slice(0, maxLength - 1)}...`
}
