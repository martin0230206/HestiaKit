import { computed, ref, watch } from 'vue'
import {
  addJsonDocumentItem,
  collectExpandableJsonPaths,
  compactJsonDocument,
  deleteJsonDocumentItem,
  formatJsonDocument,
  getJsonDocumentStats,
  parseJsonDocument,
  sortJsonDocumentKeys,
  toJsonTreeChildPath,
  updateJsonDocumentKey,
  updateJsonDocumentValue,
  type JsonTransformResult,
} from '../utils/jsonEditor'

const storageKey = 'hestiakit-json-editor'

export type JsonEditorViewMode = 'text' | 'tree'

const sampleJson = JSON.stringify(
  {
    project: 'HestiaKit',
    privacy: true,
    tools: ['password-generator', 'json-editor'],
    settings: {
      theme: 'system',
      localOnly: true,
    },
  },
  null,
  2,
)

interface StoredJsonEditorState {
  source?: string
  viewMode?: JsonEditorViewMode
}

function readStoredState(): StoredJsonEditorState {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredJsonEditorState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function getJsonTreeParentPath(path: string) {
  const separatorIndex = path.lastIndexOf('/')

  return separatorIndex > 0 ? path.slice(0, separatorIndex) : '$'
}

function remapExpandedPaths(paths: ReadonlySet<string>, currentPath: string, nextPath: string) {
  return new Set(
    [...paths].map((expandedPath) => {
      if (expandedPath === currentPath) {
        return nextPath
      }

      if (expandedPath.startsWith(`${currentPath}/`)) {
        return `${nextPath}${expandedPath.slice(currentPath.length)}`
      }

      return expandedPath
    }),
  )
}

export function useJsonEditor() {
  const storedState = readStoredState()
  const source = ref(storedState.source ?? sampleJson)
  const viewMode = ref<JsonEditorViewMode>(storedState.viewMode === 'tree' ? 'tree' : 'text')
  const expandedPaths = ref<ReadonlySet<string>>(new Set(['$']))
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
  const fileState = ref<'idle' | 'loaded' | 'failed'>('idle')
  const lastAction = ref('')

  const parseResult = computed(() => parseJsonDocument(source.value))
  const treeValue = computed(() => (parseResult.value.ok ? parseResult.value.value : undefined))
  const expandablePaths = computed(() =>
    parseResult.value.ok ? collectExpandableJsonPaths(parseResult.value.value) : [],
  )
  const stats = computed(() => getJsonDocumentStats(source.value))
  const isValid = computed(() => parseResult.value.ok)
  const issue = computed(() => parseResult.value.issue)
  const statusLabel = computed(() => (isValid.value ? '有效 JSON' : 'JSON 格式錯誤'))
  const issueLocation = computed(() => {
    if (!issue.value?.line || !issue.value.column) {
      return ''
    }

    return `第 ${issue.value.line} 行，第 ${issue.value.column} 欄`
  })

  function applyTransform(result: JsonTransformResult, successMessage: string) {
    copyState.value = 'idle'

    if (!result.ok || result.output === undefined) {
      lastAction.value = result.issue?.message ?? '無法處理 JSON。'
      return
    }

    source.value = result.output
    lastAction.value = successMessage
  }

  function formatJson() {
    applyTransform(formatJsonDocument(source.value), '已格式化')
  }

  function compactJson() {
    applyTransform(compactJsonDocument(source.value), '已壓縮')
  }

  function sortKeys() {
    applyTransform(sortJsonDocumentKeys(source.value), '已排序 key')
  }

  function updateTreeKey(path: string, nextKey: string) {
    const result = updateJsonDocumentKey(source.value, path, nextKey)

    applyTransform(result, '已更新 key')

    if (result.ok) {
      expandedPaths.value = remapExpandedPaths(
        expandedPaths.value,
        path,
        toJsonTreeChildPath(getJsonTreeParentPath(path), nextKey),
      )
    }

    return result.ok
  }

  function updateTreeValue(path: string, nextValue: unknown) {
    const result = updateJsonDocumentValue(source.value, path, nextValue)

    applyTransform(result, '已更新 value')

    return result.ok
  }

  function addTreeItem(path: string) {
    const result = addJsonDocumentItem(source.value, path)

    applyTransform(result, '已新增項目')

    if (result.ok) {
      const nextExpandedPaths = new Set(expandedPaths.value)
      nextExpandedPaths.add(path)
      expandedPaths.value = nextExpandedPaths
    }

    return result.ok
  }

  function deleteTreeItem(path: string) {
    const result = deleteJsonDocumentItem(source.value, path)

    applyTransform(result, '已刪除項目')

    return result.ok
  }

  function setViewMode(nextViewMode: JsonEditorViewMode) {
    viewMode.value = nextViewMode
  }

  function expandTree() {
    expandedPaths.value = new Set(expandablePaths.value)
  }

  function collapseTree() {
    expandedPaths.value = new Set(expandablePaths.value.length ? ['$'] : [])
  }

  function toggleTreePath(path: string) {
    const nextExpandedPaths = new Set(expandedPaths.value)

    if (nextExpandedPaths.has(path)) {
      nextExpandedPaths.delete(path)
    } else {
      nextExpandedPaths.add(path)
    }

    expandedPaths.value = nextExpandedPaths
  }

  function loadSample() {
    source.value = sampleJson
    copyState.value = 'idle'
    fileState.value = 'idle'
    lastAction.value = '已載入範例'
  }

  function clearJson() {
    source.value = ''
    copyState.value = 'idle'
    fileState.value = 'idle'
    lastAction.value = '已清空'
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(source.value)
      copyState.value = 'copied'
    } catch {
      copyState.value = 'failed'
    }
  }

  async function importFile(file: File) {
    try {
      source.value = await file.text()
      fileState.value = 'loaded'
      copyState.value = 'idle'
      lastAction.value = `已開啟 ${file.name}`
    } catch {
      fileState.value = 'failed'
      lastAction.value = '無法讀取檔案。'
    }
  }

  function downloadJson() {
    downloadText('hestiakit.json', source.value)
    lastAction.value = '已下載'
  }

  watch(
    [source, viewMode],
    () => {
      writeStoredState({
        source: source.value,
        viewMode: viewMode.value,
      })
    },
    { immediate: true },
  )

  watch(
    expandablePaths,
    (paths, previousPaths) => {
      if (!previousPaths) {
        expandedPaths.value = new Set(paths)
        return
      }

      const validPaths = new Set(paths)
      const nextExpandedPaths = new Set([...expandedPaths.value].filter((path) => validPaths.has(path)))

      if (validPaths.has('$')) {
        nextExpandedPaths.add('$')
      }

      expandedPaths.value = nextExpandedPaths
    },
    { immediate: true },
  )

  return {
    clearJson,
    collapseTree,
    compactJson,
    copyJson,
    copyState,
    addTreeItem,
    deleteTreeItem,
    downloadJson,
    expandTree,
    expandedPaths,
    fileState,
    formatJson,
    importFile,
    isValid,
    issue,
    issueLocation,
    lastAction,
    loadSample,
    setViewMode,
    sortKeys,
    source,
    stats,
    statusLabel,
    toggleTreePath,
    treeValue,
    updateTreeKey,
    updateTreeValue,
    viewMode,
  }
}
