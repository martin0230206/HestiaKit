import { computed, ref, watch } from 'vue'
import { getJsonDocumentStats } from '../utils/jsonEditor'
import {
  convertJsonToMarkdownTable,
  getMarkdownTableStats,
  type JsonMarkdownTableMode,
} from '../utils/jsonMarkdownTable'
import { getMarkdownDocumentStats } from '../utils/clipboardMarkdown'

interface StoredJsonMarkdownTableState {
  mode?: JsonMarkdownTableMode
  source?: string
}

const storageKey = 'hestiakit-json-markdown-table'
const sampleJson = JSON.stringify(
  [
    {
      orderId: 'A001',
      customer: {
        name: 'Customer A',
        email: 'customer-a@example.com',
      },
      tags: ['urgent', 'web'],
      items: [
        {
          name: 'Keyboard',
          qty: 1,
        },
        {
          name: 'Mouse',
          qty: 2,
        },
      ],
    },
    {
      orderId: 'A002',
      customer: {
        name: 'Customer B',
        email: 'customer-b@example.com',
      },
      tags: ['internal'],
      items: [
        {
          name: 'Monitor',
          qty: 1,
        },
      ],
    },
  ],
  null,
  2,
)

export const jsonMarkdownTableModeOptions: Array<{ label: string; value: JsonMarkdownTableMode }> = [
  { label: '保守', value: 'conservative' },
  { label: '攤平', value: 'flatten' },
  { label: '多表格', value: 'multi-table' },
]

function normalizeMode(mode: unknown): JsonMarkdownTableMode {
  return mode === 'flatten' || mode === 'multi-table' || mode === 'conservative' ? mode : 'conservative'
}

function readStoredState(): StoredJsonMarkdownTableState {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredJsonMarkdownTableState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function useJsonMarkdownTable() {
  const storedState = readStoredState()
  const source = ref(storedState.source ?? sampleJson)
  const mode = ref<JsonMarkdownTableMode>(normalizeMode(storedState.mode))
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

  const transformResult = computed(() => convertJsonToMarkdownTable(source.value, { mode: mode.value }))
  const output = computed(() => transformResult.value.output)
  const isValid = computed(() => transformResult.value.ok)
  const issue = computed(() => transformResult.value.issue)
  const inputStats = computed(() => getJsonDocumentStats(source.value))
  const outputStats = computed(() => getMarkdownDocumentStats(output.value))
  const tableStats = computed(() => getMarkdownTableStats(output.value))
  const statusLabel = computed(() => {
    if (!source.value.trim()) {
      return '等待輸入'
    }

    return isValid.value ? '已轉換' : '無法建立表格'
  })

  function clearSource() {
    source.value = ''
    copyState.value = 'idle'
  }

  function loadSample() {
    source.value = sampleJson
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

  watch([source, mode], () => {
    writeStoredState({
      mode: mode.value,
      source: source.value,
    })
  }, { immediate: true })

  watch([source, mode], () => {
    copyState.value = 'idle'
  })

  return {
    clearSource,
    copyOutput,
    copyState,
    inputStats,
    isValid,
    issue,
    loadSample,
    mode,
    modeOptions: jsonMarkdownTableModeOptions,
    output,
    outputStats,
    source,
    statusLabel,
    tableStats,
  }
}
