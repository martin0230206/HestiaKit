import { computed, ref, watch } from 'vue'
import {
  summarizeBase64Input,
  transformBase64Text,
  type Base64Alphabet,
  type Base64Operation,
} from '../utils/base64'

export interface Base64HistoryRecord {
  id: string
  operation: Base64Operation
  alphabet: Base64Alphabet
  input: string
  output: string
  createdAt: string
}

interface StoredBase64State {
  source?: string
  operation?: Base64Operation
  alphabet?: Base64Alphabet
  history?: Base64HistoryRecord[]
}

const storageKey = 'hestiakit-base64'
const maxHistoryRecords = 20

export const base64OperationOptions: Array<{ label: string; value: Base64Operation }> = [
  { label: '編碼', value: 'encode' },
  { label: '解碼', value: 'decode' },
]

export const base64AlphabetOptions: Array<{ label: string; value: Base64Alphabet }> = [
  { label: '標準', value: 'standard' },
  { label: 'URL-safe', value: 'url-safe' },
]

function readStoredState(): StoredBase64State {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredBase64State) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function normalizeHistory(records: unknown): Base64HistoryRecord[] {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .filter((record): record is Base64HistoryRecord => {
      if (!record || typeof record !== 'object') {
        return false
      }

      const candidate = record as Base64HistoryRecord
      return (
        typeof candidate.id === 'string' &&
        (candidate.operation === 'encode' || candidate.operation === 'decode') &&
        (candidate.alphabet === 'standard' || candidate.alphabet === 'url-safe') &&
        typeof candidate.input === 'string' &&
        typeof candidate.output === 'string' &&
        typeof candidate.createdAt === 'string'
      )
    })
    .slice(0, maxHistoryRecords)
}

function createHistoryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getOppositeOperation(currentOperation: Base64Operation): Base64Operation {
  return currentOperation === 'encode' ? 'decode' : 'encode'
}

export function useBase64() {
  const storedState = readStoredState()
  const source = ref(storedState.source ?? 'HestiaKit')
  const operation = ref<Base64Operation>(storedState.operation === 'decode' ? 'decode' : 'encode')
  const alphabet = ref<Base64Alphabet>(storedState.alphabet === 'url-safe' ? 'url-safe' : 'standard')
  const history = ref<Base64HistoryRecord[]>(normalizeHistory(storedState.history))
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
  const historyState = ref<'idle' | 'saved' | 'duplicate' | 'empty' | 'invalid'>('idle')

  const transformResult = computed(() => transformBase64Text(source.value, operation.value, { alphabet: alphabet.value }))
  const output = computed(() => transformResult.value.output ?? '')
  const issue = computed(() => transformResult.value.issue ?? '')
  const isValid = computed(() => transformResult.value.ok)
  const inputSummary = computed(() => summarizeBase64Input(source.value))
  const outputSummary = computed(() => summarizeBase64Input(output.value))
  const sourceStats = computed(() => ({
    characters: source.value.length,
    bytes: new TextEncoder().encode(source.value).length,
  }))
  const outputStats = computed(() => ({
    characters: output.value.length,
    bytes: new TextEncoder().encode(output.value).length,
  }))

  function clearSource() {
    source.value = ''
    copyState.value = 'idle'
    historyState.value = 'idle'
  }

  function swapInputOutput() {
    if (!output.value) {
      return
    }

    source.value = output.value
    operation.value = getOppositeOperation(operation.value)
    copyState.value = 'idle'
    historyState.value = 'idle'
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output.value)
      copyState.value = 'copied'
    } catch {
      copyState.value = 'failed'
    }
  }

  function saveHistoryRecord() {
    copyState.value = 'idle'

    if (!source.value && !output.value) {
      historyState.value = 'empty'
      return
    }

    if (!isValid.value) {
      historyState.value = 'invalid'
      return
    }

    const existingRecord = history.value.find(
      (record) =>
        record.operation === operation.value &&
        record.alphabet === alphabet.value &&
        record.input === source.value &&
        record.output === output.value,
    )

    if (existingRecord) {
      history.value = [existingRecord, ...history.value.filter((record) => record.id !== existingRecord.id)]
      historyState.value = 'duplicate'
      return
    }

    history.value = [
      {
        id: createHistoryId(),
        operation: operation.value,
        alphabet: alphabet.value,
        input: source.value,
        output: output.value,
        createdAt: new Date().toISOString(),
      },
      ...history.value,
    ].slice(0, maxHistoryRecords)
    historyState.value = 'saved'
  }

  function loadHistoryRecord(record: Base64HistoryRecord) {
    operation.value = record.operation
    alphabet.value = record.alphabet
    source.value = record.input
    copyState.value = 'idle'
    historyState.value = 'idle'
  }

  function deleteHistoryRecord(recordId: string) {
    history.value = history.value.filter((record) => record.id !== recordId)
  }

  function clearHistory() {
    history.value = []
  }

  watch([source, operation, alphabet, history], () => {
    writeStoredState({
      source: source.value,
      operation: operation.value,
      alphabet: alphabet.value,
      history: history.value,
    })
  }, { deep: true, immediate: true })

  watch([source, operation, alphabet], () => {
    copyState.value = 'idle'
    historyState.value = 'idle'
  })

  return {
    alphabet,
    base64AlphabetOptions,
    base64OperationOptions,
    clearHistory,
    clearSource,
    copyOutput,
    copyState,
    deleteHistoryRecord,
    history,
    historyState,
    inputSummary,
    isValid,
    issue,
    loadHistoryRecord,
    operation,
    output,
    outputStats,
    outputSummary,
    saveHistoryRecord,
    source,
    sourceStats,
    swapInputOutput,
  }
}
