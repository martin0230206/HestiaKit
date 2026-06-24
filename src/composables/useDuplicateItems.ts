import { computed, ref, watch } from 'vue'
import { removeDuplicateItems, summarizeDuplicateItemsInput } from '../utils/duplicateItems'

interface StoredDuplicateItemsState {
  source?: string
  trimItems?: boolean
  ignoreCase?: boolean
  ignoreEmptyItems?: boolean
}

const storageKey = 'hestiakit-duplicate-items'
const sampleItems = '1\n1\n1\n2\n2\n3\n3\n3\n3'

function readStoredState(): StoredDuplicateItemsState {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredDuplicateItemsState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function useDuplicateItems() {
  const storedState = readStoredState()
  const source = ref(storedState.source ?? sampleItems)
  const trimItems = ref(storedState.trimItems ?? true)
  const ignoreCase = ref(storedState.ignoreCase ?? false)
  const ignoreEmptyItems = ref(storedState.ignoreEmptyItems ?? true)
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

  const result = computed(() =>
    removeDuplicateItems(source.value, {
      trimItems: trimItems.value,
      ignoreCase: ignoreCase.value,
      ignoreEmptyItems: ignoreEmptyItems.value,
    }),
  )
  const output = computed(() => result.value.output)
  const stats = computed(() => result.value.stats)
  const inputSummary = computed(() => summarizeDuplicateItemsInput(source.value))
  const outputSummary = computed(() => summarizeDuplicateItemsInput(output.value))
  const sourceStats = computed(() => ({
    items: stats.value.sourceItems,
    characters: source.value.length,
  }))
  const outputStats = computed(() => ({
    items: stats.value.outputItems,
    characters: output.value.length,
  }))
  const statusLabel = computed(() => {
    if (!source.value) {
      return '等待輸入'
    }

    if (stats.value.duplicateItems === 0 && stats.value.skippedEmptyItems === 0) {
      return '沒有重複項目'
    }

    return '已去除重複'
  })

  function clearSource() {
    source.value = ''
    copyState.value = 'idle'
  }

  function loadSample() {
    source.value = sampleItems
    copyState.value = 'idle'
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output.value)
      copyState.value = 'copied'
    } catch {
      copyState.value = 'failed'
    }
  }

  watch([source, trimItems, ignoreCase, ignoreEmptyItems], () => {
    writeStoredState({
      source: source.value,
      trimItems: trimItems.value,
      ignoreCase: ignoreCase.value,
      ignoreEmptyItems: ignoreEmptyItems.value,
    })
  }, { immediate: true })

  watch([source, trimItems, ignoreCase, ignoreEmptyItems], () => {
    copyState.value = 'idle'
  })

  return {
    clearSource,
    copyOutput,
    copyState,
    ignoreCase,
    ignoreEmptyItems,
    inputSummary,
    loadSample,
    output,
    outputStats,
    outputSummary,
    source,
    sourceStats,
    stats,
    statusLabel,
    trimItems,
  }
}
