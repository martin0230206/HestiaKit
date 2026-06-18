<script setup lang="ts">
import { computed } from 'vue'
import { useJsonMarkdownTable } from '../composables/useJsonMarkdownTable'

const {
  clearSource,
  copyOutput,
  copyState,
  inputStats,
  isValid,
  issue,
  loadSample,
  mode,
  modeOptions,
  output,
  outputStats,
  source,
  statusLabel,
  tableStats,
} = useJsonMarkdownTable()

function formatIssueLocation(issueValue: { line?: number; column?: number } | undefined) {
  if (!issueValue?.line || !issueValue.column) {
    return ''
  }

  return `第 ${issueValue.line} 行，第 ${issueValue.column} 欄`
}

const issueLocation = computed(() => formatIssueLocation(issue.value))
</script>

<template>
  <section class="json-table-page">
    <header class="json-table-page__header">
      <h1>JSON 轉 Markdown 表格</h1>
    </header>

    <section class="json-table-workbench" aria-label="JSON 轉 Markdown 表格">
      <div class="json-table-toolbar" aria-label="JSON 轉表格操作">
        <div class="json-table-toolbar__group" aria-label="文件操作">
          <button class="icon-button" type="button" aria-label="載入範例" title="載入範例" @click="loadSample">
            <span aria-hidden="true">[]</span>
          </button>
          <button class="icon-button icon-button--danger" type="button" aria-label="清空" title="清空" :disabled="!source" @click="clearSource">
            <span aria-hidden="true">×</span>
          </button>
          <button
            class="icon-button"
            type="button"
            aria-label="複製 Markdown"
            :title="copyState === 'copied' ? '已複製' : '複製 Markdown'"
            :disabled="!output || !isValid"
            @click="copyOutput"
          >
            <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
          </button>
        </div>

        <div class="json-table-mode" role="group" aria-label="轉換模式">
          <span class="json-table-mode__label">模式</span>
          <div class="json-table-mode__options">
            <button
              v-for="option in modeOptions"
              :key="option.value"
              class="json-table-mode__button"
              :class="{ 'json-table-mode__button--active': mode === option.value }"
              type="button"
              @click="mode = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="json-table-editor">
        <main class="json-table-editor__main">
          <section class="json-table-panel" aria-label="JSON 輸入">
            <div class="json-table-panel__header">
              <div>
                <p class="json-table-panel__eyebrow">Input</p>
                <h2>JSON</h2>
              </div>
            </div>

            <textarea
              v-model="source"
              class="json-table-textarea"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="JSON 輸入內容"
            ></textarea>

            <dl class="json-table-stats">
              <div>
                <dt>行數</dt>
                <dd>{{ inputStats.lines }}</dd>
              </div>
              <div>
                <dt>字元</dt>
                <dd>{{ inputStats.characters }}</dd>
              </div>
            </dl>
          </section>

          <section class="json-table-panel" aria-label="Markdown 表格輸出">
            <div class="json-table-panel__header">
              <div>
                <p class="json-table-panel__eyebrow">Output</p>
                <h2>Markdown 表格</h2>
              </div>
              <button
                class="button button--primary json-table-panel__copy"
                type="button"
                aria-label="複製 Markdown"
                :title="copyState === 'copied' ? '已複製' : '複製 Markdown'"
                :disabled="!output || !isValid"
                @click="copyOutput"
              >
                <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
              </button>
            </div>

            <textarea
              class="json-table-textarea json-table-textarea--output"
              :value="output"
              readonly
              spellcheck="false"
              aria-label="Markdown 表格輸出內容"
            ></textarea>

            <dl class="json-table-stats">
              <div>
                <dt>行數</dt>
                <dd>{{ outputStats.lines }}</dd>
              </div>
              <div>
                <dt>字元</dt>
                <dd>{{ outputStats.characters }}</dd>
              </div>
            </dl>
          </section>
        </main>

        <aside class="json-table-sidebar" aria-label="轉換狀態">
          <div class="json-table-status" :data-valid="isValid">
            <span class="json-table-status__dot" aria-hidden="true"></span>
            <span>{{ statusLabel }}</span>
          </div>

          <dl class="json-table-summary">
            <div>
              <dt>欄數</dt>
              <dd>{{ tableStats.columns }}</dd>
            </div>
            <div>
              <dt>資料列</dt>
              <dd>{{ tableStats.rows }}</dd>
            </div>
            <div>
              <dt>輸出</dt>
              <dd>{{ outputStats.characters }}</dd>
            </div>
          </dl>

          <p v-if="issue" class="json-table-feedback">
            {{ issueLocation || issue.message }}
          </p>
          <p v-if="copyState === 'failed'" class="json-table-feedback">無法存取剪貼簿，請手動選取輸出內容複製。</p>
        </aside>
      </div>
    </section>
  </section>
</template>

<style scoped>
.json-table-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1280px;
  margin: 0 auto;
}

.json-table-page__header h1 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 2.4rem;
  line-height: 1.05;
  letter-spacing: 0;
}

.json-table-workbench {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.json-table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.json-table-toolbar__group {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.json-table-mode {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: 0;
  border: 0;
  margin: 0;
}

.json-table-mode__label {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.json-table-mode__options {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.json-table-mode__button {
  min-height: 34px;
  min-width: 58px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
}

.json-table-mode__button:hover:not(.json-table-mode__button--active) {
  color: var(--color-text-strong);
  background: var(--color-surface-muted);
}

.json-table-mode__button--active {
  color: var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.json-table-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  min-height: 660px;
}

.json-table-editor__main {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.json-table-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-right: 1px solid var(--color-border);
}

.json-table-panel:nth-child(2) {
  border-right: 0;
}

.json-table-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 76px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.json-table-panel__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
  letter-spacing: 0;
}

.json-table-panel__eyebrow {
  margin: 0 0 2px;
  color: var(--color-text-soft);
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.json-table-panel__copy {
  display: grid;
  width: 40px;
  min-width: 40px;
  padding: 0;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 1.05rem;
}

.json-table-textarea {
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

.json-table-textarea--output {
  color: var(--color-primary-strong);
}

.json-table-textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.json-table-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.json-table-stats div,
.json-table-summary div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.json-table-stats dt,
.json-table-summary dt {
  color: var(--color-text-muted);
  font-weight: 700;
}

.json-table-stats dd,
.json-table-summary dd {
  margin: 0;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-weight: 800;
}

.json-table-sidebar {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  padding: var(--space-4);
  border-left: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.json-table-status {
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

.json-table-status[data-valid='true'] {
  color: var(--color-success-strong);
}

.json-table-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.json-table-summary {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.json-table-feedback {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  background: var(--color-surface);
}

.button,
.icon-button {
  font: inherit;
  cursor: pointer;
}

.button {
  min-height: 40px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 800;
}

.button--primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
}

.button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
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
  font-family: var(--font-mono);
  font-weight: 900;
}

.icon-button:hover:not(:disabled) {
  color: var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.icon-button--danger {
  color: var(--color-danger);
}

.button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.button:focus-visible,
.icon-button:focus-visible,
.json-table-mode__button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 1080px) {
  .json-table-editor {
    grid-template-columns: 1fr;
  }

  .json-table-sidebar {
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }
}

@media (max-width: 820px) {
  .json-table-editor__main {
    grid-template-columns: 1fr;
  }

  .json-table-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .json-table-panel:nth-child(2) {
    border-bottom: 0;
  }

  .json-table-textarea {
    min-height: 300px;
    resize: vertical;
  }
}

@media (max-width: 620px) {
  .json-table-page__header h1 {
    font-size: 2rem;
  }

  .json-table-toolbar__group,
  .json-table-mode,
  .json-table-stats,
  .json-table-panel__header {
    align-items: stretch;
    flex-direction: column;
  }

  .json-table-mode__options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .icon-button {
    flex: 1 1 38px;
  }
}
</style>
