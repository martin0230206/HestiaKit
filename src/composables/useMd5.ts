import { computed, ref, watch } from 'vue'
import { createMd5Hash, summarizeMd5Input, type Md5LetterCase } from '../utils/md5'

export interface Md5HistoryRecord {
  id: string
  letterCase: Md5LetterCase
  input: string
  output: string
  createdAt: string
}

interface StoredMd5State {
  source?: string
  letterCase?: Md5LetterCase
  history?: Md5HistoryRecord[]
}

const storageKey = 'hestiakit-md5'
const maxHistoryRecords = 20

export const md5LetterCaseOptions: Array<{ label: string; value: Md5LetterCase }> = [
  { label: '小寫', value: 'lower' },
  { label: '大寫', value: 'upper' },
]

function readStoredState(): StoredMd5State {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredMd5State) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function normalizeHistory(records: unknown): Md5HistoryRecord[] {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .filter((record): record is Md5HistoryRecord => {
      if (!record || typeof record !== 'object') {
        return false
      }

      const candidate = record as Md5HistoryRecord
      return (
        typeof candidate.id === 'string' &&
        (candidate.letterCase === 'lower' || candidate.letterCase === 'upper') &&
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

export function useMd5() {
  const storedState = readStoredState()
  const source = ref(storedState.source ?? 'HestiaKit')
  const letterCase = ref<Md5LetterCase>(storedState.letterCase === 'upper' ? 'upper' : 'lower')
  const history = ref<Md5HistoryRecord[]>(normalizeHistory(storedState.history))
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
  const historyState = ref<'idle' | 'saved' | 'duplicate' | 'empty'>('idle')

  const output = computed(() => createMd5Hash(source.value, { letterCase: letterCase.value }))
  const inputSummary = computed(() => summarizeMd5Input(source.value))
  const outputSummary = computed(() => summarizeMd5Input(output.value))
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

    if (!source.value) {
      historyState.value = 'empty'
      return
    }

    const existingRecord = history.value.find(
      (record) =>
        record.letterCase === letterCase.value &&
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
        letterCase: letterCase.value,
        input: source.value,
        output: output.value,
        createdAt: new Date().toISOString(),
      },
      ...history.value,
    ].slice(0, maxHistoryRecords)
    historyState.value = 'saved'
  }

  function loadHistoryRecord(record: Md5HistoryRecord) {
    letterCase.value = record.letterCase
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

  watch([source, letterCase, history], () => {
    writeStoredState({
      source: source.value,
      letterCase: letterCase.value,
      history: history.value,
    })
  }, { deep: true, immediate: true })

  watch([source, letterCase], () => {
    copyState.value = 'idle'
    historyState.value = 'idle'
  })

  return {
    clearHistory,
    clearSource,
    copyOutput,
    copyState,
    deleteHistoryRecord,
    history,
    historyState,
    inputSummary,
    letterCase,
    loadHistoryRecord,
    md5LetterCaseOptions,
    output,
    outputStats,
    outputSummary,
    saveHistoryRecord,
    source,
    sourceStats,
  }
}
