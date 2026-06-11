<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import JsonTreeNode from '../components/json/JsonTreeNode.vue'
import SegmentedControl from '../components/forms/SegmentedControl.vue'
import { formatJson, getJsonStats, minifyJson, parseJson, sortJsonValue } from '../utils/jsonViewer'

type ViewMode = 'tree' | 'text'
interface StoredJsonViewerState {
  rawJson?: string
  viewMode?: ViewMode
}

const sampleJson = `{
  "project": "HestiaKit",
  "tools": [
    {
      "name": "密碼產生器",
      "enabled": true
    },
    {
      "name": "JSON 檢視器",
      "enabled": true
    }
  ],
  "updatedAt": "2026-06-11T00:00:00+08:00"
}`

const storageKey = 'hestiakit-json-viewer'
const storedState = readStoredState()
const rawJson = ref(storedState.rawJson ?? sampleJson)
const viewMode = ref<ViewMode>(storedState.viewMode === 'text' ? 'text' : 'tree')
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

const viewModeOptions: Array<{ label: string; value: ViewMode }> = [
  { label: '樹狀', value: 'tree' },
  { label: '文字', value: 'text' },
]

const parsedJson = computed(() => parseJson(rawJson.value))

function readStoredState(): StoredJsonViewerState {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState() {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        rawJson: rawJson.value,
        viewMode: viewMode.value,
      }),
    )
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

const formattedJson = computed(() => {
  if (!parsedJson.value.ok) {
    return ''
  }

  return formatJson(parsedJson.value.value)
})

const stats = computed(() => {
  if (!parsedJson.value.ok) {
    return undefined
  }

  return getJsonStats(parsedJson.value.value)
})

const validationStatus = computed(() => {
  if (parsedJson.value.ok) {
    return 'JSON 格式有效'
  }

  const { line, column, message } = parsedJson.value
  const location = line && column ? `第 ${line} 行，第 ${column} 欄` : '無法定位錯誤位置'

  return `${location}：${message}`
})

function applyFormattedJson() {
  if (parsedJson.value.ok) {
    rawJson.value = formatJson(parsedJson.value.value)
  }
}

function applyMinifiedJson() {
  if (parsedJson.value.ok) {
    rawJson.value = minifyJson(parsedJson.value.value)
  }
}

function applySortedJson() {
  if (parsedJson.value.ok) {
    rawJson.value = formatJson(sortJsonValue(parsedJson.value.value))
  }
}

function loadSampleJson() {
  rawJson.value = sampleJson
}

function clearJson() {
  rawJson.value = ''
}

async function copyFormattedJson() {
  if (!formattedJson.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(formattedJson.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
}

watch(rawJson, () => {
  copyState.value = 'idle'
})

watch([rawJson, viewMode], writeStoredState, { immediate: true })
</script>

<template>
  <section class="tool-page">
    <header class="tool-page__header">
      <div class="tool-page__heading">
        <div>
          <h1>JSON 檢視器</h1>
        </div>
      </div>
    </header>

    <div class="json-viewer">
      <section class="json-viewer__editor" aria-label="JSON 輸入">
        <div class="json-viewer__panel-header">
          <div>
            <p class="json-viewer__label">輸入</p>
            <p class="json-viewer__status" :data-valid="parsedJson.ok">{{ validationStatus }}</p>
          </div>

          <div class="json-viewer__actions">
            <button class="button button--ghost" type="button" @click="loadSampleJson">範例</button>
            <button class="button button--ghost" type="button" @click="clearJson">清除</button>
          </div>
        </div>

        <textarea
          v-model="rawJson"
          class="json-viewer__textarea"
          spellcheck="false"
          aria-label="JSON 原始碼"
        ></textarea>

        <div class="json-viewer__toolbar" aria-label="JSON 操作">
          <button class="button button--primary" type="button" :disabled="!parsedJson.ok" @click="applyFormattedJson">
            格式化
          </button>
          <button class="button button--ghost" type="button" :disabled="!parsedJson.ok" @click="applyMinifiedJson">
            壓縮
          </button>
          <button class="button button--ghost" type="button" :disabled="!parsedJson.ok" @click="applySortedJson">
            排序鍵名
          </button>
          <button class="button button--ghost" type="button" :disabled="!parsedJson.ok" @click="copyFormattedJson">
            {{ copyState === 'copied' ? '已複製' : '複製格式化 JSON' }}
          </button>
        </div>

        <p v-if="copyState === 'failed'" class="json-viewer__feedback">無法存取剪貼簿，請手動選取內容複製。</p>
      </section>

      <section class="json-viewer__preview" aria-label="JSON 檢視結果">
        <div class="json-viewer__panel-header json-viewer__panel-header--preview">
          <div>
            <p class="json-viewer__label">檢視</p>
            <p v-if="stats" class="json-viewer__meta">
              {{ stats.objects }} 物件 · {{ stats.arrays }} 陣列 · {{ stats.keys }} 鍵 · 深度 {{ stats.maxDepth }}
            </p>
            <p v-else class="json-viewer__meta">等待有效 JSON</p>
          </div>

          <SegmentedControl v-model="viewMode" class="json-viewer__mode" label="檢視模式" :options="viewModeOptions" />
        </div>

        <div class="json-viewer__output">
          <ol v-if="parsedJson.ok && viewMode === 'tree'" class="json-viewer__tree">
            <JsonTreeNode :value="parsedJson.value" />
          </ol>
          <pre v-else-if="parsedJson.ok" class="json-viewer__code">{{ formattedJson }}</pre>
          <div v-else class="json-viewer__empty">
            <p>JSON 格式無效</p>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.tool-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1240px;
  margin: 0 auto;
}

.tool-page__header {
  display: grid;
  gap: var(--space-3);
}

.tool-page__heading h1 {
  margin: 0 0 var(--space-3);
  color: var(--color-text-strong);
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: 1;
  letter-spacing: 0;
}

.json-viewer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-5);
}

.json-viewer__editor,
.json-viewer__preview {
  display: grid;
  min-height: 680px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.json-viewer__editor {
  grid-template-rows: auto minmax(360px, 1fr) auto auto;
}

.json-viewer__preview {
  grid-template-rows: auto minmax(0, 1fr);
}

.json-viewer__panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.json-viewer__panel-header--preview {
  align-items: center;
}

.json-viewer__label {
  margin: 0 0 var(--space-2);
  color: var(--color-text-soft);
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.json-viewer__status,
.json-viewer__meta,
.json-viewer__feedback {
  margin: 0;
  color: var(--color-text-muted);
}

.json-viewer__status[data-valid='true'] {
  color: var(--color-success-strong);
  font-weight: 750;
}

.json-viewer__status[data-valid='false'],
.json-viewer__feedback {
  color: var(--color-danger);
}

.json-viewer__actions,
.json-viewer__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.json-viewer__textarea,
.json-viewer__code,
.json-viewer__output {
  font-family: var(--font-mono);
  font-size: 0.94rem;
  line-height: 1.58;
}

.json-viewer__textarea {
  width: 100%;
  min-width: 0;
  resize: none;
  padding: var(--space-5);
  border: 0;
  color: var(--color-text);
  background: var(--color-surface);
  outline: none;
  tab-size: 2;
}

.json-viewer__textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.json-viewer__toolbar {
  padding: var(--space-5);
  border-top: 1px solid var(--color-border);
}

.json-viewer__feedback {
  padding: 0 var(--space-5) var(--space-5);
}

.json-viewer__mode {
  width: min(260px, 100%);
}

.json-viewer__output {
  min-width: 0;
  overflow: auto;
  padding: var(--space-5);
}

.json-viewer__tree {
  min-width: max-content;
  padding: 0;
  margin: 0;
}

.json-viewer__code {
  min-width: max-content;
  margin: 0;
  color: var(--color-text);
  white-space: pre;
}

.json-viewer__empty {
  display: grid;
  min-height: 100%;
  place-items: center;
  color: var(--color-text-muted);
}

.json-viewer__empty p {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 750;
}

.button {
  min-height: 40px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.button--primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
}

.button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.button--ghost {
  color: var(--color-text-strong);
  border-color: var(--color-border);
  background: var(--color-surface-muted);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 1080px) {
  .json-viewer {
    grid-template-columns: 1fr;
  }

  .json-viewer__editor,
  .json-viewer__preview {
    min-height: 560px;
  }
}

@media (max-width: 700px) {
  .json-viewer__panel-header,
  .json-viewer__panel-header--preview {
    align-items: stretch;
    flex-direction: column;
    padding: var(--space-4);
  }

  .json-viewer__textarea,
  .json-viewer__output,
  .json-viewer__toolbar {
    padding: var(--space-4);
  }

  .json-viewer__mode {
    width: 100%;
  }

  .button {
    flex: 1;
  }
}
</style>
