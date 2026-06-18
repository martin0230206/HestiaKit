import { computed, ref, watch } from 'vue'
import { getJsonDocumentStats } from '../utils/jsonEditor'
import {
  convertJsonToMarkdownTable,
  getMarkdownTableStats,
} from '../utils/jsonMarkdownTable'
import { getMarkdownDocumentStats } from '../utils/clipboardMarkdown'

interface StoredJsonMarkdownTableState {
  source?: string
}

const storageKey = 'hestiakit-json-markdown-table'
const sampleJson = JSON.stringify(
  [
    {
      name: '密碼產生器',
      category: '安全工具',
      localOnly: true,
    },
    {
      name: 'JSON 編輯器',
      category: '格式工具',
      localOnly: true,
    },
    {
      name: '剪貼簿轉 Markdown',
      category: '格式工具',
      localOnly: true,
    },
  ],
  null,
  2,
)

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
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

  const transformResult = computed(() => convertJsonToMarkdownTable(source.value))
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

  watch(source, () => {
    writeStoredState({
      source: source.value,
    })
  }, { immediate: true })

  watch(source, () => {
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
    output,
    outputStats,
    source,
    statusLabel,
    tableStats,
  }
}
