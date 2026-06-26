<script setup lang="ts">
import { computed, ref } from 'vue'
import SwitchControl from '../components/forms/SwitchControl.vue'
import { useCsvTable } from '../composables/useCsvTable'

const fileInput = ref<HTMLInputElement | null>(null)

const {
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
} = useCsvTable()

const issueLocation = computed(() => {
  if (!issue.value?.line || !issue.value.column) {
    return ''
  }

  return `第 ${issue.value.line} 行，第 ${issue.value.column} 欄`
})

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    await loadFile(file)
  }

  input.value = ''
}
</script>

<template>
  <section class="csv-table-page">
    <header class="csv-table-page__header">
      <h1>CSV 表格檢視器</h1>
    </header>

    <section class="csv-table-workbench" aria-label="CSV 表格檢視器">
      <div class="csv-table-toolbar" aria-label="CSV 操作">
        <div class="csv-table-toolbar__group" aria-label="文件操作">
          <button class="icon-button" type="button" aria-label="載入範例" title="載入範例" @click="loadSample">
            <span aria-hidden="true">[]</span>
          </button>
          <button
            class="icon-button"
            type="button"
            aria-label="選擇 CSV 檔案"
            title="選擇 CSV 檔案"
            :disabled="fileState === 'loading'"
            @click="openFilePicker"
          >
            <span aria-hidden="true">CSV</span>
          </button>
          <button
            class="icon-button icon-button--danger"
            type="button"
            aria-label="清空"
            title="清空"
            :disabled="!source"
            @click="clearSource"
          >
            <span aria-hidden="true">x</span>
          </button>
          <input
            ref="fileInput"
            class="csv-table-file-input"
            type="file"
            accept=".csv,text/csv"
            aria-label="選擇 CSV 檔案"
            @change="handleFileChange"
          />
        </div>
        <SwitchControl class="csv-table-header-toggle" v-model="hasHeader" label="第一列作為標題" />
      </div>

      <div class="csv-table-editor">
        <main class="csv-table-editor__main">
          <section class="csv-table-panel" aria-label="CSV 輸入">
            <div class="csv-table-panel__header">
              <div>
                <p class="csv-table-panel__eyebrow">Input</p>
                <h2>CSV 內容</h2>
              </div>
            </div>

            <textarea
              v-model="source"
              class="csv-table-textarea"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="CSV 輸入內容"
            ></textarea>

            <dl class="csv-table-stats">
              <div>
                <dt>行數</dt>
                <dd>{{ sourceStats.lines }}</dd>
              </div>
              <div>
                <dt>字元</dt>
                <dd>{{ sourceStats.characters }}</dd>
              </div>
            </dl>
          </section>

          <section class="csv-table-panel" aria-label="表格預覽">
            <div class="csv-table-panel__header">
              <div>
                <p class="csv-table-panel__eyebrow">Preview</p>
                <h2>表格</h2>
              </div>
              <button
                class="icon-button csv-table-panel__copy"
                type="button"
                aria-label="複製表格"
                :title="copyState === 'copied' ? '已複製' : '複製表格'"
                :disabled="!hasTable || !isValid"
                @click="copyTable"
              >
                <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
              </button>
            </div>

            <div class="csv-table-preview" :data-empty="!hasTable || !isValid">
              <p v-if="!source.trim()" class="csv-table-empty">貼上 CSV 或選擇檔案後會在這裡顯示表格。</p>
              <p v-else-if="!isValid" class="csv-table-empty csv-table-empty--danger">
                {{ issueLocation || issue?.message }}
              </p>
              <p v-else-if="!hasTable" class="csv-table-empty">CSV 內容沒有可顯示的欄位。</p>
              <table v-else class="csv-table-result">
                <thead>
                  <tr>
                    <th v-for="(header, columnIndex) in table.headers" :key="`${columnIndex}-${header}`" scope="col">
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex">
                    <td v-for="(cell, columnIndex) in row" :key="`${rowIndex}-${columnIndex}`">
                      {{ cell }}
                    </td>
                  </tr>
                  <tr v-if="table.rows.length === 0">
                    <td :colspan="table.headers.length" class="csv-table-result__empty-row">沒有資料列</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <dl class="csv-table-stats">
              <div>
                <dt>欄數</dt>
                <dd>{{ tableStats.columns }}</dd>
              </div>
              <div>
                <dt>資料列</dt>
                <dd>{{ tableStats.rows }}</dd>
              </div>
            </dl>
          </section>
        </main>
      </div>
    </section>
  </section>
</template>

<style scoped>
.csv-table-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1440px;
  margin: 0 auto;
}

.csv-table-page__header h1 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 2.4rem;
  line-height: 1.05;
  letter-spacing: 0;
}

.csv-table-workbench {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.csv-table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.csv-table-toolbar__group {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.csv-table-header-toggle {
  min-height: 40px;
  min-width: 210px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
}

.csv-table-header-toggle :deep(.switch-control__label) {
  white-space: nowrap;
}

.csv-table-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.csv-table-editor {
  display: grid;
  min-height: 660px;
}

.csv-table-editor__main {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
}

.csv-table-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-right: 1px solid var(--color-border);
}

.csv-table-panel:nth-child(2) {
  border-right: 0;
}

.csv-table-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 76px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.csv-table-panel__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
  letter-spacing: 0;
}

.csv-table-panel__eyebrow {
  margin: 0 0 2px;
  color: var(--color-text-soft);
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.icon-button.csv-table-panel__copy {
  min-width: 40px;
  min-height: 40px;
  color: var(--color-on-primary);
  background: var(--color-primary);
}

.icon-button.csv-table-panel__copy:hover:not(:disabled) {
  color: var(--color-on-primary);
  background: var(--color-primary-hover);
}

.csv-table-textarea {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  resize: none;
  overflow: auto;
  padding: var(--space-4);
  border: 0;
  color: var(--color-text-strong);
  background: var(--color-surface);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  line-height: 1.62;
  outline: none;
  tab-size: 2;
}

.csv-table-textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.csv-table-preview {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: var(--space-4);
  background: var(--color-surface);
}

.csv-table-preview[data-empty='true'] {
  display: grid;
  place-items: center;
}

.csv-table-empty {
  max-width: 360px;
  margin: 0;
  color: var(--color-text-muted);
  text-align: center;
  font-weight: 750;
}

.csv-table-empty--danger {
  color: var(--color-danger);
}

.csv-table-result {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.92rem;
}

.csv-table-result th,
.csv-table-result td {
  max-width: 320px;
  padding: var(--space-2) var(--space-3);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  text-align: left;
  vertical-align: top;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.csv-table-result th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: var(--color-text-strong);
  background: var(--color-surface-muted);
  font-weight: 850;
}

.csv-table-result td {
  background: var(--color-surface);
}

.csv-table-result tr:hover td {
  background: var(--color-surface-muted);
}

.csv-table-result th:first-child,
.csv-table-result td:first-child {
  border-left: 1px solid var(--color-border);
}

.csv-table-result thead th {
  border-top: 1px solid var(--color-border);
}

.csv-table-result__empty-row {
  color: var(--color-text-muted);
  text-align: center;
  font-weight: 750;
}

.csv-table-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.csv-table-stats div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.csv-table-stats dt {
  color: var(--color-text-muted);
  font-weight: 700;
}

.csv-table-stats dd {
  margin: 0;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-weight: 800;
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
  line-height: 1;
  cursor: pointer;
}

.icon-button span {
  display: grid;
  min-width: 1em;
  min-height: 1em;
  place-items: center;
  line-height: 1;
}

.icon-button:hover:not(:disabled) {
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

@media (max-width: 820px) {
  .csv-table-editor__main {
    grid-template-columns: 1fr;
  }

  .csv-table-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .csv-table-panel:nth-child(2) {
    border-bottom: 0;
  }

  .csv-table-textarea,
  .csv-table-preview {
    min-height: 320px;
  }

  .csv-table-textarea {
    resize: vertical;
  }
}

@media (max-width: 620px) {
  .csv-table-page__header h1 {
    font-size: 2rem;
  }

  .csv-table-toolbar__group,
  .csv-table-stats,
  .csv-table-panel__header {
    align-items: stretch;
    flex-direction: column;
  }

  .csv-table-header-toggle {
    min-width: 0;
  }

  .icon-button {
    flex: 1 1 38px;
  }
}
</style>
