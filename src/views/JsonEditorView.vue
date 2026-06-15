<script setup lang="ts">
import { ref } from 'vue'
import JsonTreeNode from '../components/json-editor/JsonTreeNode.vue'
import { useJsonEditor } from '../composables/useJsonEditor'

const {
  addTreeItem,
  clearJson,
  collapseTree,
  compactJson,
  copyJson,
  copyState,
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
} = useJsonEditor()

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    void importFile(file)
  }

  input.value = ''
}
</script>

<template>
  <section class="json-page">
    <header class="json-page__header">
      <h1>JSON 編輯器</h1>
    </header>

    <section class="json-workbench" aria-label="JSON 編輯器">
      <div class="json-toolbar" aria-label="JSON 操作">
        <div class="json-toolbar__group" aria-label="檢視模式">
          <button
            class="icon-button"
            :class="{ 'icon-button--active': viewMode === 'text' }"
            type="button"
            aria-label="文字模式"
            title="文字模式"
            @click="setViewMode('text')"
          >
            <span aria-hidden="true">T</span>
          </button>
          <button
            class="icon-button"
            :class="{ 'icon-button--active': viewMode === 'tree' }"
            type="button"
            aria-label="樹狀模式"
            title="樹狀模式"
            @click="setViewMode('tree')"
          >
            <span aria-hidden="true">{}</span>
          </button>
        </div>

        <div class="json-toolbar__group" aria-label="文件操作">
          <button class="icon-button" type="button" aria-label="載入範例" title="載入範例" @click="loadSample">
            <span aria-hidden="true">{}</span>
          </button>
          <button class="icon-button" type="button" aria-label="開啟檔案" title="開啟檔案" @click="openFilePicker">
            <span class="file-transfer-icon file-transfer-icon--upload" aria-hidden="true">
              <span class="file-transfer-icon__arrow"></span>
            </span>
          </button>
          <button class="icon-button" type="button" aria-label="下載 JSON" title="下載 JSON" :disabled="!source" @click="downloadJson">
            <span class="file-transfer-icon file-transfer-icon--download" aria-hidden="true">
              <span class="file-transfer-icon__arrow"></span>
            </span>
          </button>
          <button class="icon-button icon-button--danger" type="button" aria-label="清空" title="清空" :disabled="!source" @click="clearJson">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div class="json-toolbar__group" aria-label="內容處理">
          <button class="icon-button" type="button" aria-label="格式化" title="格式化" :disabled="!source" @click="formatJson">
            <span aria-hidden="true">↧</span>
          </button>
          <button class="icon-button" type="button" aria-label="壓縮" title="壓縮" :disabled="!source" @click="compactJson">
            <span aria-hidden="true">⇥</span>
          </button>
          <button class="icon-button" type="button" aria-label="排序 key" title="排序 key" :disabled="!source" @click="sortKeys">
            <span aria-hidden="true">A↓</span>
          </button>
          <button class="icon-button" type="button" aria-label="複製" :title="copyState === 'copied' ? '已複製' : '複製'" :disabled="!source" @click="copyJson">
            <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
          </button>
        </div>

        <div class="json-toolbar__group" aria-label="樹狀操作">
          <button class="icon-button" type="button" aria-label="展開全部" title="展開全部" :disabled="viewMode !== 'tree' || !isValid" @click="expandTree">
            <span class="tree-action-icon tree-action-icon--expand" aria-hidden="true">
              <span class="tree-action-icon__chevron tree-action-icon__chevron--up"></span>
              <span class="tree-action-icon__chevron tree-action-icon__chevron--down"></span>
            </span>
          </button>
          <button class="icon-button" type="button" aria-label="收合全部" title="收合全部" :disabled="viewMode !== 'tree' || !isValid" @click="collapseTree">
            <span class="tree-action-icon tree-action-icon--collapse" aria-hidden="true">
              <span class="tree-action-icon__chevron tree-action-icon__chevron--down"></span>
              <span class="tree-action-icon__chevron tree-action-icon__chevron--up"></span>
            </span>
          </button>
        </div>

        <input
          ref="fileInput"
          class="json-toolbar__file"
          type="file"
          accept=".json,application/json,text/json"
          @change="handleFileChange"
        />
      </div>

      <div class="json-editor">
        <div class="json-editor__main">
          <label v-if="viewMode === 'text'" class="json-editor__field">
            <span class="json-editor__label">內容</span>
            <textarea
              v-model="source"
              class="json-editor__textarea"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="JSON 內容"
            ></textarea>
          </label>

          <div v-else class="json-tree" aria-label="JSON 樹狀內容">
            <div class="json-tree__header" aria-hidden="true">
              <span></span>
              <span>key</span>
              <span>type</span>
              <span>value</span>
              <span>actions</span>
            </div>

            <JsonTreeNode
              v-if="isValid"
              :value="treeValue"
              path="$"
              :expanded-paths="expandedPaths"
              :add-item="addTreeItem"
              :delete-item="deleteTreeItem"
              :toggle-path="toggleTreePath"
              :update-key="updateTreeKey"
              :update-value="updateTreeValue"
            />

            <div v-else class="json-tree__empty">
              <p>JSON 格式錯誤</p>
              <p>{{ issueLocation || issue?.message || '請先修正內容。' }}</p>
            </div>
          </div>
        </div>

        <aside class="json-status" aria-label="JSON 狀態">
          <div class="json-status__summary" :data-valid="isValid">
            <span class="json-status__dot" aria-hidden="true"></span>
            <span>{{ statusLabel }}</span>
          </div>

          <dl class="json-status__stats">
            <div>
              <dt>行數</dt>
              <dd>{{ stats.lines }}</dd>
            </div>
            <div>
              <dt>字元</dt>
              <dd>{{ stats.characters }}</dd>
            </div>
          </dl>

          <div v-if="issue" class="json-status__issue">
            <p class="json-status__issue-title">{{ issueLocation || '解析失敗' }}</p>
            <p>{{ issue.message }}</p>
          </div>

          <p v-if="copyState === 'failed'" class="json-status__feedback">無法存取剪貼簿，請手動選取內容複製。</p>
          <p v-if="fileState === 'failed'" class="json-status__feedback">無法讀取檔案。</p>
          <p v-if="lastAction" class="json-status__action">{{ lastAction }}</p>
        </aside>
      </div>
    </section>
  </section>
</template>

<style scoped>
.json-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1180px;
  margin: 0 auto;
}

.json-page__header h1 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 2.4rem;
  line-height: 1.05;
  letter-spacing: 0;
}

.json-workbench {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.json-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.json-toolbar__group {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.json-toolbar__file {
  display: none;
}

.json-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  min-height: 620px;
}

.json-editor__main,
.json-editor__field {
  display: grid;
  min-width: 0;
  grid-template-rows: auto 1fr;
}

.json-editor__label {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.json-editor__textarea {
  width: 100%;
  min-width: 0;
  min-height: 560px;
  resize: vertical;
  padding: var(--space-4);
  border: 0;
  color: var(--color-text-strong);
  background: var(--color-surface);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  line-height: 1.62;
  outline: none;
  tab-size: 2;
  white-space: pre;
}

.json-editor__textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.json-tree {
  min-width: 0;
  min-height: 620px;
  overflow: auto;
  background: var(--color-surface);
}

.json-tree__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: 28px minmax(90px, 0.75fr) minmax(76px, 0.35fr) minmax(0, 1.4fr) 62px;
  gap: var(--space-2);
  min-width: 700px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-soft);
  background: var(--color-surface);
  font-size: 0.75rem;
  font-weight: 850;
  text-transform: uppercase;
}

.json-tree__empty {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
  color: var(--color-danger);
}

.json-tree__empty p {
  margin: 0;
}

.json-status {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  padding: var(--space-4);
  border-left: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.json-status__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  background: var(--color-surface);
  font-weight: 850;
}

.json-status__summary[data-valid='true'] {
  color: var(--color-success-strong);
}

.json-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.json-status__stats {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.json-status__stats div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.json-status__stats dt {
  color: var(--color-text-muted);
  font-weight: 700;
}

.json-status__stats dd {
  margin: 0;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-weight: 800;
}

.json-status__issue,
.json-status__feedback,
.json-status__action {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.json-status__issue {
  color: var(--color-danger);
}

.json-status__issue p {
  margin: 0;
}

.json-status__issue p + p {
  margin-top: var(--space-2);
}

.json-status__issue-title {
  font-weight: 850;
}

.json-status__feedback {
  color: var(--color-danger);
}

.json-status__action {
  color: var(--color-text-muted);
}

.icon-button {
  display: grid;
  min-width: 38px;
  min-height: 34px;
  place-items: center;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-text-strong);
  background: transparent;
  font: inherit;
  font-family: var(--font-mono);
  font-weight: 900;
  cursor: pointer;
}

.icon-button:hover:not(:disabled),
.icon-button--active {
  color: var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.icon-button--danger {
  color: var(--color-danger);
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.icon-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.file-transfer-icon {
  position: relative;
  width: 18px;
  height: 18px;
}

.file-transfer-icon::after {
  position: absolute;
  right: 2px;
  bottom: 1px;
  left: 2px;
  height: 5px;
  border: 2px solid currentColor;
  border-top: 0;
  border-radius: 0 0 3px 3px;
  content: '';
}

.file-transfer-icon__arrow {
  position: absolute;
  left: 50%;
  width: 2px;
  height: 10px;
  border-radius: 999px;
  background: currentColor;
  transform: translateX(-50%);
}

.file-transfer-icon__arrow::before,
.file-transfer-icon__arrow::after {
  position: absolute;
  width: 7px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  content: '';
}

.file-transfer-icon--upload .file-transfer-icon__arrow {
  top: 2px;
}

.file-transfer-icon--upload .file-transfer-icon__arrow::before,
.file-transfer-icon--upload .file-transfer-icon__arrow::after {
  top: 1px;
}

.file-transfer-icon--upload .file-transfer-icon__arrow::before {
  right: 0;
  transform: rotate(-45deg);
  transform-origin: right center;
}

.file-transfer-icon--upload .file-transfer-icon__arrow::after {
  left: 0;
  transform: rotate(45deg);
  transform-origin: left center;
}

.file-transfer-icon--download .file-transfer-icon__arrow {
  top: 1px;
}

.file-transfer-icon--download .file-transfer-icon__arrow::before,
.file-transfer-icon--download .file-transfer-icon__arrow::after {
  bottom: 1px;
}

.file-transfer-icon--download .file-transfer-icon__arrow::before {
  right: 0;
  transform: rotate(45deg);
  transform-origin: right center;
}

.file-transfer-icon--download .file-transfer-icon__arrow::after {
  left: 0;
  transform: rotate(-45deg);
  transform-origin: left center;
}

.tree-action-icon {
  position: relative;
  width: 18px;
  height: 18px;
}

.tree-action-icon__chevron {
  position: absolute;
  left: 50%;
  width: 12px;
  height: 6px;
  transform: translateX(-50%);
}

.tree-action-icon__chevron:first-child {
  top: 1px;
}

.tree-action-icon__chevron:last-child {
  bottom: 1px;
}

.tree-action-icon__chevron::before,
.tree-action-icon__chevron::after {
  position: absolute;
  top: 2px;
  width: 8px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  content: '';
}

.tree-action-icon__chevron::before {
  left: 0;
}

.tree-action-icon__chevron::after {
  right: 0;
}

.tree-action-icon__chevron--up::before {
  transform: rotate(-38deg);
}

.tree-action-icon__chevron--up::after {
  transform: rotate(38deg);
}

.tree-action-icon__chevron--down::before {
  transform: rotate(38deg);
}

.tree-action-icon__chevron--down::after {
  transform: rotate(-38deg);
}

@media (max-width: 900px) {
  .json-editor {
    grid-template-columns: 1fr;
  }

  .json-status {
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }
}

@media (max-width: 720px) {
  .json-tree__header {
    grid-template-columns: 28px minmax(72px, 0.8fr) minmax(0, 1.2fr) 62px;
  }

  .json-tree__header span:nth-child(3) {
    display: none;
  }
}

@media (max-width: 620px) {
  .json-page__header h1 {
    font-size: 2rem;
  }

  .json-toolbar__group {
    flex: 1 1 auto;
  }

  .icon-button {
    flex: 1 1 38px;
  }
}
</style>
