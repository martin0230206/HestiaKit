<script setup lang="ts">
import { useClipboardMarkdown } from '../composables/useClipboardMarkdown'

const {
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
} = useClipboardMarkdown()
</script>

<template>
  <section class="clipboard-page">
    <header class="clipboard-page__header">
      <h1>剪貼簿轉 Markdown</h1>
    </header>

    <section class="clipboard-workbench" aria-label="剪貼簿轉 Markdown">
      <div class="clipboard-toolbar" aria-label="Markdown 轉換操作">
        <div class="clipboard-toolbar__group" aria-label="文件操作">
          <button class="icon-button" type="button" aria-label="載入範例" title="載入範例" @click="loadSample">
            <span aria-hidden="true">MD</span>
          </button>
          <button class="icon-button icon-button--danger" type="button" aria-label="清空" title="清空" :disabled="!source" @click="clearSource">
            <span aria-hidden="true">×</span>
          </button>
          <button
            class="icon-button"
            type="button"
            aria-label="複製"
            :title="copyState === 'copied' ? '已複製' : '複製'"
            :disabled="!output || !isValid"
            @click="copyOutput"
          >
            <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
          </button>
        </div>
      </div>

      <div class="clipboard-editor">
        <main class="clipboard-editor__main">
          <section class="clipboard-panel" aria-label="來源內容">
            <div class="clipboard-panel__header">
              <div>
                <p class="clipboard-panel__eyebrow">Source</p>
                <h2>來源</h2>
              </div>
              <span class="clipboard-pill">{{ inputMode === 'html' ? 'HTML' : 'Text' }}</span>
            </div>

            <textarea
              v-model="source"
              class="clipboard-textarea"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="來源內容"
              @input="handleManualInput"
              @paste="handlePaste"
            ></textarea>

            <dl class="clipboard-stats">
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

          <section class="clipboard-panel" aria-label="Markdown 輸出">
            <div class="clipboard-panel__header">
              <div>
                <p class="clipboard-panel__eyebrow">Output</p>
                <h2>Markdown</h2>
              </div>
              <button
                class="button button--primary clipboard-panel__copy"
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
              class="clipboard-textarea clipboard-textarea--output"
              :value="output"
              readonly
              spellcheck="false"
              aria-label="Markdown 輸出內容"
            ></textarea>

            <dl class="clipboard-stats">
              <div>
                <dt>行數</dt>
                <dd>{{ outputStats.lines }}</dd>
              </div>
              <div>
                <dt>字數</dt>
                <dd>{{ outputStats.words }}</dd>
              </div>
              <div>
                <dt>字元</dt>
                <dd>{{ outputStats.characters }}</dd>
              </div>
            </dl>
          </section>
        </main>

        <aside class="clipboard-sidebar" aria-label="轉換狀態">
          <div class="clipboard-status" :data-valid="isValid">
            <span class="clipboard-status__dot" aria-hidden="true"></span>
            <span>{{ statusLabel }}</span>
          </div>

          <dl class="clipboard-summary">
            <div>
              <dt>來源</dt>
              <dd>{{ pasteState === 'html' ? 'HTML' : pasteState === 'plain' ? '純文字' : pasteState === 'empty' ? '空白' : '手動' }}</dd>
            </div>
            <div>
              <dt>處理方式</dt>
              <dd>{{ inputMode === 'html' ? 'HTML' : '純文字' }}</dd>
            </div>
            <div>
              <dt>輸出</dt>
              <dd>{{ outputStats.characters }}</dd>
            </div>
          </dl>

          <p v-if="issue" class="clipboard-feedback">{{ issue }}</p>
          <p v-if="copyState === 'failed'" class="clipboard-feedback">無法存取剪貼簿，請手動選取輸出內容複製。</p>
        </aside>
      </div>
    </section>
  </section>
</template>

<style scoped>
.clipboard-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1440px;
  margin: 0 auto;
}

.clipboard-page__header h1 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 2.4rem;
  line-height: 1.05;
  letter-spacing: 0;
}

.clipboard-workbench {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.clipboard-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.clipboard-toolbar__group {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.clipboard-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  min-height: 720px;
}

.clipboard-editor__main {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.clipboard-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-right: 1px solid var(--color-border);
}

.clipboard-panel:nth-child(2) {
  border-right: 0;
}

.clipboard-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 76px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.clipboard-panel__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
  letter-spacing: 0;
}

.clipboard-panel__eyebrow {
  margin: 0 0 2px;
  color: var(--color-text-soft);
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.clipboard-pill {
  min-width: 64px;
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  background: var(--color-surface);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 900;
  text-align: center;
}

.clipboard-panel__copy {
  display: grid;
  width: 40px;
  min-width: 40px;
  padding: 0;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 1.05rem;
}

.clipboard-textarea {
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

.clipboard-textarea--output {
  color: var(--color-primary-strong);
}

.clipboard-textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.clipboard-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.clipboard-stats div,
.clipboard-summary div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.clipboard-stats dt,
.clipboard-summary dt {
  color: var(--color-text-muted);
  font-weight: 700;
}

.clipboard-stats dd,
.clipboard-summary dd {
  margin: 0;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-weight: 800;
}

.clipboard-sidebar {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  padding: var(--space-4);
  border-left: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.clipboard-status {
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

.clipboard-status[data-valid='true'] {
  color: var(--color-success-strong);
}

.clipboard-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.clipboard-summary {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.clipboard-feedback {
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
.icon-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 1080px) {
  .clipboard-editor {
    grid-template-columns: 1fr;
  }

  .clipboard-sidebar {
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }
}

@media (max-width: 820px) {
  .clipboard-editor__main {
    grid-template-columns: 1fr;
  }

  .clipboard-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .clipboard-panel:nth-child(2) {
    border-bottom: 0;
  }

  .clipboard-textarea {
    min-height: 300px;
    resize: vertical;
  }
}

@media (max-width: 620px) {
  .clipboard-page__header h1 {
    font-size: 2rem;
  }

  .clipboard-toolbar__group {
    flex: 1 1 auto;
  }

  .clipboard-panel__header {
    align-items: stretch;
    flex-direction: column;
  }

  .icon-button {
    flex: 1 1 38px;
  }
}
</style>
