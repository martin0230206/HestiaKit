<script setup lang="ts">
import SegmentedControl from '../components/forms/SegmentedControl.vue'
import { useBase64, type Base64HistoryRecord } from '../composables/useBase64'

const {
  alphabet,
  base64AlphabetOptions,
  base64OperationOptions,
  clearHistory,
  clearSource,
  copyOutput,
  copyState,
  deleteHistoryRecord,
  history,
  historyState,
  isValid,
  issue,
  loadHistoryRecord,
  operation,
  output,
  outputStats,
  saveHistoryRecord,
  source,
  sourceStats,
  swapInputOutput,
} = useBase64()

function formatRecordDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getOperationLabel(record: Base64HistoryRecord) {
  return record.operation === 'encode' ? '編碼' : '解碼'
}

function getAlphabetLabel(record: Base64HistoryRecord) {
  return record.alphabet === 'url-safe' ? 'URL-safe' : '標準'
}
</script>

<template>
  <section class="base64-page">
    <header class="base64-page__header">
      <h1>Base64 編碼/解碼</h1>
    </header>

    <section class="base64-settings" aria-label="Base64 設定">
      <div class="base64-settings__controls">
        <SegmentedControl v-model="operation" label="操作" :options="base64OperationOptions" />
        <div class="base64-format">
          <SegmentedControl v-model="alphabet" label="格式" :options="base64AlphabetOptions" />
          <span class="base64-tooltip">
            <button
              class="base64-tooltip__trigger"
              type="button"
              aria-label="格式說明"
              aria-describedby="base64-format-help"
            >
              ?
            </button>
            <span id="base64-format-help" class="base64-tooltip__content" role="tooltip">
              標準格式適合一般文字與資料交換；URL-safe 會用 - 和 _ 取代 + 和 /，並省略尾端 =，適合放在網址、Query string 或檔名中。
            </span>
          </span>
        </div>
      </div>

      <div class="base64-settings__actions">
        <div class="base64-status" :data-valid="isValid">
          <span class="base64-status__dot" aria-hidden="true"></span>
          <span>{{ isValid ? '可轉換' : issue }}</span>
        </div>

        <button class="button button--primary" type="button" :disabled="!isValid" @click="saveHistoryRecord">
          記錄本次
        </button>
      </div>

      <div
        v-if="copyState === 'failed' || historyState !== 'idle'"
        class="base64-feedback-list"
        aria-live="polite"
      >
        <p v-if="copyState === 'failed'" class="base64-feedback">無法存取剪貼簿，請手動選取輸出內容複製。</p>
        <p v-if="historyState === 'saved'" class="base64-feedback base64-feedback--muted">已加入紀錄。</p>
        <p v-if="historyState === 'duplicate'" class="base64-feedback base64-feedback--muted">已移到紀錄最上方。</p>
        <p v-if="historyState === 'empty'" class="base64-feedback">沒有可記錄的內容。</p>
        <p v-if="historyState === 'invalid'" class="base64-feedback">請先修正輸入內容。</p>
      </div>
    </section>

    <section class="base64-workbench" aria-label="Base64 編碼與解碼">
      <div class="base64-editor">
        <section class="base64-panel" aria-label="輸入內容">
          <div class="base64-panel__header">
            <div>
              <p class="base64-panel__eyebrow">Input</p>
              <h2>輸入</h2>
            </div>
            <button class="button button--ghost" type="button" :disabled="!source" @click="clearSource">清空</button>
          </div>

          <textarea
            v-model="source"
            class="base64-textarea"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-label="Base64 輸入內容"
          ></textarea>

          <dl class="base64-stats">
            <div>
              <dt>字元</dt>
              <dd>{{ sourceStats.characters }}</dd>
            </div>
            <div>
              <dt>位元組</dt>
              <dd>{{ sourceStats.bytes }}</dd>
            </div>
          </dl>
        </section>

        <section class="base64-panel" aria-label="輸出內容">
          <div class="base64-panel__header">
            <div>
              <p class="base64-panel__eyebrow">Output</p>
              <h2>輸出</h2>
            </div>
            <div class="base64-panel__actions">
              <button
                class="button button--ghost base64-panel__action-button"
                type="button"
                aria-label="交換"
                title="交換"
                :disabled="!output || !isValid"
                @click="swapInputOutput"
              >
                <span aria-hidden="true">⇄</span>
              </button>
              <button
                class="button button--primary base64-panel__action-button"
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

          <textarea
            class="base64-textarea base64-textarea--output"
            :value="output"
            readonly
            spellcheck="false"
            aria-label="Base64 輸出內容"
          ></textarea>

          <dl class="base64-stats">
            <div>
              <dt>字元</dt>
              <dd>{{ outputStats.characters }}</dd>
            </div>
            <div>
              <dt>位元組</dt>
              <dd>{{ outputStats.bytes }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>

    <section class="base64-history" aria-label="轉換紀錄">
      <div class="base64-history__rail" aria-hidden="true">
        <span class="base64-history__rail-count">{{ history.length }}</span>
        <span class="base64-history__rail-label">紀錄</span>
      </div>

      <div class="base64-history__panel">
        <div class="base64-history__header">
          <h2>轉換紀錄</h2>
          <button class="text-button" type="button" :disabled="history.length === 0" @click="clearHistory">
            全部刪除
          </button>
        </div>

        <div class="base64-history__body">
          <div v-if="history.length === 0" class="base64-history__empty">尚無紀錄</div>

          <div v-else class="base64-history__list">
            <article v-for="record in history" :key="record.id" class="history-item">
              <button class="history-item__main" type="button" @click="loadHistoryRecord(record)">
                <span class="history-item__meta">
                  {{ getOperationLabel(record) }} · {{ getAlphabetLabel(record) }} · {{ formatRecordDate(record.createdAt) }}
                </span>
                <span class="history-item__content">
                  <span class="history-item__field">
                    <span class="history-item__label">輸入</span>
                    <span class="history-item__text">{{ record.input }}</span>
                  </span>
                  <span class="history-item__field">
                    <span class="history-item__label">輸出</span>
                    <span class="history-item__result">{{ record.output }}</span>
                  </span>
                </span>
              </button>
              <button
                class="history-item__delete"
                type="button"
                aria-label="刪除紀錄"
                title="刪除紀錄"
                @click="deleteHistoryRecord(record.id)"
              >
                ×
              </button>
            </article>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.base64-page {
  display: grid;
  gap: var(--space-5);
  max-width: 1320px;
  margin: 0 auto;
}

.base64-page__header h1 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: clamp(2rem, 3vw, 2.85rem);
  line-height: 1.05;
  letter-spacing: 0;
}

.base64-workbench {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.base64-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
  min-height: clamp(360px, calc(100svh - 430px), 520px);
}

.base64-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-right: 1px solid var(--color-border);
}

.base64-panel:last-child {
  border-right: 0;
}

.base64-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 76px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.base64-panel__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
  letter-spacing: 0;
}

.base64-panel__eyebrow {
  margin: 0 0 2px;
  color: var(--color-text-soft);
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.base64-panel__actions {
  display: flex;
  gap: var(--space-2);
}

.button.base64-panel__action-button {
  display: grid;
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  padding: 0;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-weight: 900;
}

.base64-textarea {
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
}

.base64-textarea--output {
  color: var(--color-primary-strong);
  background: var(--color-surface);
}

.base64-textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.base64-stats {
  display: flex;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.base64-stats div {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.base64-stats dt {
  color: var(--color-text-muted);
  font-weight: 700;
}

.base64-stats dd {
  margin: 0;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-weight: 800;
}

.base64-settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.base64-settings__controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 280px));
  gap: var(--space-4);
  min-width: 0;
}

.base64-settings__actions {
  display: flex;
  align-items: end;
  gap: var(--space-3);
  min-width: min(420px, 100%);
}

.base64-settings :deep(.segmented-control) {
  min-width: 0;
}

.base64-settings :deep(.segmented-control legend) {
  margin-bottom: var(--space-2);
}

.base64-settings :deep(.segmented-control__button) {
  min-height: 38px;
}

.base64-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  min-width: 0;
  flex: 1;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  background: var(--color-surface-muted);
  font-weight: 850;
}

.base64-status span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base64-format {
  position: relative;
  display: grid;
  gap: var(--space-2);
}

.base64-tooltip {
  position: absolute;
  top: 0;
  right: 0;
}

.base64-tooltip__trigger {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  color: var(--color-text-muted);
  background: var(--color-surface);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: help;
}

.base64-tooltip__content {
  position: absolute;
  right: 0;
  bottom: calc(100% + var(--space-2));
  z-index: 2;
  width: min(260px, calc(100vw - 48px));
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
  font-size: 0.86rem;
  font-weight: 650;
  line-height: 1.55;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.base64-tooltip:hover .base64-tooltip__content,
.base64-tooltip:focus-within .base64-tooltip__content {
  opacity: 1;
  transform: translateY(0);
}

.base64-tooltip__trigger:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.base64-status[data-valid='true'] {
  color: var(--color-success-strong);
}

.base64-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.base64-feedback {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  background: var(--color-surface-muted);
}

.base64-feedback--muted {
  color: var(--color-text-muted);
}

.base64-feedback-list {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: var(--space-3);
}

.base64-history {
  display: grid;
  position: fixed;
  top: 72px;
  right: 0;
  bottom: var(--space-4);
  z-index: 20;
  grid-template-columns: 48px minmax(0, 360px);
  gap: 0;
  width: 408px;
  transform: translateX(360px);
  transition: transform 0.18s ease;
}

.base64-history:hover,
.base64-history:focus-within {
  transform: translateX(0);
}

.base64-history__rail {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--space-3);
  min-width: 0;
  border: 1px solid var(--color-border);
  border-right: 0;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  color: var(--color-text-strong);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.base64-history__rail-count {
  display: grid;
  min-width: 26px;
  height: 26px;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--color-on-primary);
  background: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 900;
}

.base64-history__rail-label {
  writing-mode: vertical-rl;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.base64-history__panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  background: var(--color-surface-muted);
  box-shadow: var(--shadow-panel);
}

.base64-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.base64-history__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
  letter-spacing: 0;
}

.base64-history__empty {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  background: var(--color-surface);
  text-align: center;
  font-weight: 750;
}

.base64-history__body {
  min-height: 0;
  overflow: hidden;
}

.base64-history__list {
  display: grid;
  max-height: 100%;
  gap: var(--space-3);
  overflow-y: auto;
  padding-right: var(--space-1);
  scrollbar-gutter: stable;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition:
    border-color 0.16s ease,
    background 0.16s ease;
}

.history-item:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-muted);
}

.history-item__main {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.history-item__meta {
  color: var(--color-text-soft);
  font-size: 0.78rem;
  font-weight: 800;
}

.history-item__content {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.history-item__field {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.history-item__label {
  color: var(--color-text-soft);
  font-size: 0.72rem;
  font-weight: 850;
}

.history-item__text,
.history-item__result {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item__text {
  color: var(--color-text-strong);
}

.history-item__result {
  color: var(--color-text-muted);
}

.history-item__delete {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  background: var(--color-surface);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.history-item__delete:hover {
  border-color: currentColor;
  background: var(--color-surface-muted);
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
  background: var(--color-surface);
}

.text-button {
  padding: 0;
  border: 0;
  color: var(--color-danger);
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
}

.button:disabled,
.text-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.button:focus-visible,
.text-button:focus-visible,
.history-item__main:focus-visible,
.history-item__delete:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 980px) {
  .base64-settings {
    grid-template-columns: 1fr;
  }

  .base64-settings__actions {
    min-width: 0;
  }

  .base64-editor {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .base64-panel {
    min-height: 360px;
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .base64-panel:last-child {
    border-bottom: 0;
  }

  .base64-history {
    position: static;
    grid-template-columns: 1fr;
    gap: 0;
    width: auto;
    transform: none;
  }

  .base64-history__rail {
    display: none;
  }

  .base64-history__panel {
    border-radius: var(--radius-xl);
  }

  .base64-history__list {
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}

@media (max-width: 620px) {
  .base64-page__header h1 {
    font-size: 2rem;
  }

  .base64-panel__header,
  .base64-panel__actions,
  .base64-stats,
  .base64-history__header {
    align-items: stretch;
    flex-direction: column;
  }

  .base64-panel__actions {
    display: flex;
    align-self: flex-start;
    flex-direction: row;
  }

  .base64-settings__controls,
  .base64-settings__actions,
  .history-item__content {
    grid-template-columns: 1fr;
  }

  .base64-settings__actions {
    display: grid;
  }

  .base64-settings :deep(.segmented-control__options) {
    grid-template-columns: repeat(var(--segmented-control-option-count), minmax(0, 1fr));
  }

  .button.base64-panel__action-button {
    width: 40px;
  }

  .base64-textarea {
    min-height: 220px;
    resize: vertical;
  }

  .button {
    width: 100%;
  }
}
</style>
