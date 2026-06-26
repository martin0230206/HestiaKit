import { computed, ref, watch } from 'vue'
import { createTsvTableText, getCsvSourceStats, getCsvTableStats, parseCsvTable } from '../utils/csvTable'

interface StoredCsvTableState {
  hasHeader?: boolean
  source?: string
}

const storageKey = 'hestiakit-csv-table'
const sampleCsv = [
  '訂單編號,客戶,品項,數量,備註',
  'A001,林小姐,鍵盤,1,"急件, 今日出貨"',
  'A002,陳先生,螢幕,2,"需附發票"',
  'A003,王小明,滑鼠,3,"分批出貨\n第二批下週寄送"',
].join('\n')

function readStoredState(): StoredCsvTableState {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredCsvTableState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function useCsvTable() {
  const storedState = readStoredState()
  const source = ref(storedState.source ?? sampleCsv)
  const hasHeader = ref(storedState.hasHeader ?? true)
  const fileState = ref<'idle' | 'loading' | 'loaded' | 'failed'>('idle')
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

  const parseResult = computed(() => parseCsvTable(source.value, { hasHeader: hasHeader.value }))
  const table = computed(() => parseResult.value.table)
  const tableText = computed(() => createTsvTableText(table.value))
  const isValid = computed(() => parseResult.value.ok)
  const issue = computed(() => parseResult.value.issue)
  const sourceStats = computed(() => getCsvSourceStats(source.value))
  const tableStats = computed(() => getCsvTableStats(table.value))
  const hasTable = computed(() => table.value.headers.length > 0)

  function clearSource() {
    source.value = ''
    fileState.value = 'idle'
    copyState.value = 'idle'
  }

  function loadSample() {
    source.value = sampleCsv
    fileState.value = 'idle'
    copyState.value = 'idle'
  }

  async function loadFile(file: File) {
    fileState.value = 'loading'
    copyState.value = 'idle'

    try {
      source.value = await file.text()
      fileState.value = 'loaded'
    } catch {
      fileState.value = 'failed'
    }
  }

  async function copyTable() {
    try {
      await navigator.clipboard.writeText(tableText.value)
      copyState.value = 'copied'
    } catch {
      copyState.value = 'failed'
    }
  }

  watch([source, hasHeader], () => {
    writeStoredState({
      hasHeader: hasHeader.value,
      source: source.value,
    })
  }, { immediate: true })

  watch([source, hasHeader], () => {
    copyState.value = 'idle'
  })

  return {
    clearSource,
    copyState,
    copyTable,
    fileState,
    hasHeader,
    hasTable,
    isValid,
    issue,
    loadFile,
    loadSample,
    source,
    sourceStats,
    table,
    tableStats,
  }
}
