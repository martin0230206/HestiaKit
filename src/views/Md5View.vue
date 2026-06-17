<script setup lang="ts">
import SegmentedControl from '../components/forms/SegmentedControl.vue'
import { useMd5, type Md5HistoryRecord } from '../composables/useMd5'

const {
  clearHistory,
  clearSource,
  copyOutput,
  copyState,
  deleteHistoryRecord,
  history,
  historyState,
  letterCase,
  loadHistoryRecord,
  md5LetterCaseOptions,
  output,
  outputStats,
  saveHistoryRecord,
  source,
  sourceStats,
} = useMd5()

function formatRecordDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getLetterCaseLabel(record: Md5HistoryRecord) {
  return record.letterCase === 'upper' ? '大寫' : '小寫'
}
</script>

<template>
  <section class="md5-page">
    <header class="md5-page__header">
      <h1>MD5 雜湊</h1>
    </header>

    <section class="md5-settings" aria-label="MD5 設定">
      <div class="md5-settings__controls">
        <SegmentedControl v-model="letterCase" label="輸出格式" :options="md5LetterCaseOptions" />
      </div>

      <div class="md5-settings__actions">
        <div class="md5-status">
          <span class="md5-status__dot" aria-hidden="true"></span>
          <span>可產生雜湊</span>
        </div>

        <button class="button button--primary" type="button" :disabled="!source" @click="saveHistoryRecord">
          記錄本次
        </button>
      </div>

      <div
        v-if="copyState === 'failed' || historyState !== 'idle'"
        class="md5-feedback-list"
        aria-live="polite"
      >
        <p v-if="copyState === 'failed'" class="md5-feedback">無法存取剪貼簿，請手動選取輸出內容複製。</p>
        <p v-if="historyState === 'saved'" class="md5-feedback md5-feedback--muted">已加入紀錄。</p>
        <p v-if="historyState === 'duplicate'" class="md5-feedback md5-feedback--muted">已移到紀錄最上方。</p>
        <p v-if="historyState === 'empty'" class="md5-feedback">沒有可記錄的內容。</p>
      </div>
    </section>

    <section class="md5-workbench" aria-label="MD5 雜湊產生器">
      <div class="md5-editor">
        <section class="md5-panel" aria-label="輸入內容">
          <div class="md5-panel__header">
            <div>
              <p class="md5-panel__eyebrow">Input</p>
              <h2>輸入</h2>
            </div>
            <button class="button button--ghost" type="button" :disabled="!source" @click="clearSource">清空</button>
          </div>

          <textarea
            v-model="source"
            class="md5-textarea"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-label="MD5 輸入內容"
          ></textarea>

          <dl class="md5-stats">
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

        <section class="md5-panel" aria-label="MD5 輸出內容">
          <div class="md5-panel__header">
            <div>
              <p class="md5-panel__eyebrow">Output</p>
              <h2>輸出</h2>
            </div>
            <div class="md5-panel__actions">
              <button
                class="button button--primary md5-panel__action-button"
                type="button"
                aria-label="複製"
                :title="copyState === 'copied' ? '已複製' : '複製'"
                :disabled="!output"
                @click="copyOutput"
              >
                <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
              </button>
            </div>
          </div>

          <textarea
            class="md5-textarea md5-textarea--output"
            :value="output"
            readonly
            spellcheck="false"
            aria-label="MD5 雜湊值"
          ></textarea>

          <dl class="md5-stats">
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

    <section class="md5-history" aria-label="轉換紀錄">
      <div class="md5-history__rail" aria-hidden="true">
        <span class="md5-history__rail-count">{{ history.length }}</span>
        <span class="md5-history__rail-label">紀錄</span>
      </div>

      <div class="md5-history__panel">
        <div class="md5-history__header">
          <h2>雜湊紀錄</h2>
          <button class="text-button" type="button" :disabled="history.length === 0" @click="clearHistory">
            全部刪除
          </button>
        </div>

        <div class="md5-history__body">
          <div v-if="history.length === 0" class="md5-history__empty">尚無紀錄</div>

          <div v-else class="md5-history__list">
            <article v-for="record in history" :key="record.id" class="history-item">
              <button class="history-item__main" type="button" @click="loadHistoryRecord(record)">
                <span class="history-item__meta">
                  {{ getLetterCaseLabel(record) }} · {{ formatRecordDate(record.createdAt) }}
                </span>
                <span class="history-item__content">
                  <span class="history-item__field">
                    <span class="history-item__label">輸入</span>
                    <span class="history-item__text">{{ record.input }}</span>
                  </span>
                  <span class="history-item__field">
                    <span class="history-item__label">MD5</span>
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
.md5-page {
  display: grid;
  gap: var(--space-5);
  max-width: 1320px;
  margin: 0 auto;
}

.md5-page__header h1 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: clamp(2rem, 3vw, 2.85rem);
  line-height: 1.05;
  letter-spacing: 0;
}

.md5-settings {
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

.md5-settings__controls {
  display: grid;
  grid-template-columns: minmax(220px, 280px);
  gap: var(--space-4);
  min-width: 0;
}

.md5-settings__actions {
  display: flex;
  align-items: end;
  gap: var(--space-3);
  min-width: min(420px, 100%);
}

.md5-settings :deep(.segmented-control) {
  min-width: 0;
}

.md5-settings :deep(.segmented-control legend) {
  margin-bottom: var(--space-2);
}

.md5-settings :deep(.segmented-control__button) {
  min-height: 38px;
}

.md5-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  min-width: 0;
  flex: 1;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-success-strong);
  background: var(--color-surface-muted);
  font-weight: 850;
}

.md5-status span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.md5-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.md5-feedback-list {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: var(--space-3);
}

.md5-feedback {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  background: var(--color-surface-muted);
}

.md5-feedback--muted {
  color: var(--color-text-muted);
}

.md5-workbench {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.md5-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
  min-height: clamp(360px, calc(100svh - 430px), 520px);
}

.md5-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-right: 1px solid var(--color-border);
}

.md5-panel:last-child {
  border-right: 0;
}

.md5-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 76px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.md5-panel__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
  letter-spacing: 0;
}

.md5-panel__eyebrow {
  margin: 0 0 2px;
  color: var(--color-text-soft);
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.md5-panel__actions {
  display: flex;
  gap: var(--space-2);
}

.button.md5-panel__action-button {
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

.md5-textarea {
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

.md5-textarea--output {
  color: var(--color-primary-strong);
  background: var(--color-surface);
}

.md5-textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.md5-stats {
  display: flex;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.md5-stats div {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.md5-stats dt {
  color: var(--color-text-muted);
  font-weight: 700;
}

.md5-stats dd {
  margin: 0;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-weight: 800;
}

.md5-history {
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

.md5-history:hover,
.md5-history:focus-within {
  transform: translateX(0);
}

.md5-history__rail {
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

.md5-history__rail-count {
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

.md5-history__rail-label {
  writing-mode: vertical-rl;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.md5-history__panel {
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

.md5-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.md5-history__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
}

.md5-history__empty {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  background: var(--color-surface);
  text-align: center;
  font-weight: 750;
}

.md5-history__body {
  min-height: 0;
  overflow: hidden;
}

.md5-history__list {
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
  background: transparent;
  color: inherit;
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
  .md5-settings {
    grid-template-columns: 1fr;
  }

  .md5-settings__actions {
    min-width: 0;
  }

  .md5-editor {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .md5-panel {
    min-height: 360px;
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .md5-panel:last-child {
    border-bottom: 0;
  }

  .md5-history {
    position: static;
    grid-template-columns: 1fr;
    gap: 0;
    width: auto;
    transform: none;
  }

  .md5-history__rail {
    display: none;
  }

  .md5-history__panel {
    border-radius: var(--radius-xl);
  }

  .md5-history__list {
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}

@media (max-width: 620px) {
  .md5-page__header h1 {
    font-size: 2rem;
  }

  .md5-panel__header,
  .md5-panel__actions,
  .md5-stats,
  .md5-history__header {
    align-items: stretch;
    flex-direction: column;
  }

  .md5-panel__actions {
    display: flex;
    align-self: flex-start;
    flex-direction: row;
  }

  .md5-settings__controls,
  .md5-settings__actions,
  .history-item__content {
    grid-template-columns: 1fr;
  }

  .md5-settings__actions {
    display: grid;
  }

  .md5-settings :deep(.segmented-control__options) {
    grid-template-columns: repeat(var(--segmented-control-option-count), minmax(0, 1fr));
  }

  .button.md5-panel__action-button {
    width: 40px;
  }

  .md5-textarea {
    min-height: 220px;
    resize: vertical;
  }

  .button {
    width: 100%;
  }
}
</style>
