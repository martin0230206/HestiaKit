import { computed, ref, watch } from 'vue'
import {
  convertClipboardInputToMarkdown,
  getMarkdownDocumentStats,
  type ClipboardMarkdownInput,
} from '../utils/clipboardMarkdown'

export type ClipboardMarkdownInputMode = 'html' | 'plain'
export type ClipboardMarkdownPasteState = 'idle' | 'html' | 'plain' | 'empty'

interface StoredClipboardMarkdownState {
  source?: string
  inputMode?: ClipboardMarkdownInputMode
}

const storageKey = 'hestiakit-clipboard-markdown'
const sampleHtml = `<h1>HestiaKit</h1>
<p><strong>隱私優先</strong>的瀏覽器工具箱。</p>
<ul>
  <li>複製網頁或文件中的富文字</li>
  <li>貼上後轉成 Markdown</li>
</ul>`

function readStoredState(): StoredClipboardMarkdownState {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredClipboardMarkdownState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function createClipboardInput(source: string, inputMode: ClipboardMarkdownInputMode): ClipboardMarkdownInput {
  return inputMode === 'html'
    ? {
        html: source,
        plainText: '',
      }
    : {
        html: '',
        plainText: source,
      }
}

export function useClipboardMarkdown() {
  const storedState = readStoredState()
  const source = ref(storedState.source ?? sampleHtml)
  const inputMode = ref<ClipboardMarkdownInputMode>(storedState.inputMode === 'plain' ? 'plain' : 'html')
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
  const pasteState = ref<ClipboardMarkdownPasteState>('idle')

  const transformResult = computed(() => convertClipboardInputToMarkdown(createClipboardInput(source.value, inputMode.value)))
  const output = computed(() => transformResult.value.output)
  const isValid = computed(() => transformResult.value.ok)
  const issue = computed(() => transformResult.value.issue ?? '')
  const inputStats = computed(() => getMarkdownDocumentStats(source.value))
  const outputStats = computed(() => getMarkdownDocumentStats(output.value))
  const statusLabel = computed(() => {
    if (!source.value.trim()) {
      return '等待貼上'
    }

    return isValid.value ? '已轉換' : '轉換失敗'
  })

  function handlePaste(event: ClipboardEvent) {
    const html = event.clipboardData?.getData('text/html') ?? ''
    const plainText = event.clipboardData?.getData('text/plain') ?? ''
    const nextSource = html || plainText

    event.preventDefault()
    copyState.value = 'idle'

    if (!nextSource) {
      pasteState.value = 'empty'
      return
    }

    source.value = nextSource
    inputMode.value = html ? 'html' : 'plain'
    pasteState.value = html ? 'html' : 'plain'
  }

  function handleManualInput() {
    inputMode.value = 'html'
    pasteState.value = 'idle'
  }

  function clearSource() {
    source.value = ''
    copyState.value = 'idle'
    pasteState.value = 'idle'
  }

  function loadSample() {
    source.value = sampleHtml
    inputMode.value = 'html'
    copyState.value = 'idle'
    pasteState.value = 'idle'
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output.value)
      copyState.value = 'copied'
    } catch {
      copyState.value = 'failed'
    }
  }

  watch([source, inputMode], () => {
    writeStoredState({
      source: source.value,
      inputMode: inputMode.value,
    })
  }, { immediate: true })

  watch([source, inputMode], () => {
    copyState.value = 'idle'
  })

  return {
    clearSource,
    copyOutput,
    copyState,
    handleManualInput,
    handlePaste,
    inputMode,
    inputStats,
    isValid,
    issue,
    loadSample,
    output,
    outputStats,
    pasteState,
    source,
    statusLabel,
  }
}
