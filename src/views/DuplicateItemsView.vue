<script setup lang="ts">
import SwitchControl from '../components/forms/SwitchControl.vue'
import { useDuplicateItems } from '../composables/useDuplicateItems'

const {
  clearSource,
  copyOutput,
  copyState,
  ignoreCase,
  ignoreEmptyItems,
  loadSample,
  output,
  outputStats,
  source,
  sourceStats,
  stats,
  statusLabel,
  trimItems,
} = useDuplicateItems()
</script>

<template>
  <section class="duplicate-items-page">
    <header class="duplicate-items-page__header">
      <h1>去除重複項目</h1>
    </header>

    <section class="duplicate-items-workbench" aria-label="去除重複項目">
      <div class="duplicate-items-toolbar" aria-label="項目操作">
        <div class="duplicate-items-toolbar__group" aria-label="文件操作">
          <button class="icon-button" type="button" aria-label="載入範例" title="載入範例" @click="loadSample">
            <span aria-hidden="true">[]</span>
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
          <button
            class="icon-button"
            type="button"
            aria-label="複製結果"
            :title="copyState === 'copied' ? '已複製' : '複製結果'"
            :disabled="!output"
            @click="copyOutput"
          >
            <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
          </button>
        </div>
      </div>

      <div class="duplicate-items-editor">
        <main class="duplicate-items-editor__main">
          <section class="duplicate-items-panel" aria-label="輸入項目">
            <div class="duplicate-items-panel__header">
              <div>
                <p class="duplicate-items-panel__eyebrow">Input</p>
                <h2>項目清單</h2>
              </div>
            </div>

            <textarea
              v-model="source"
              class="duplicate-items-textarea"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="輸入項目，每行一筆"
            ></textarea>

            <dl class="duplicate-items-stats">
              <div>
                <dt>項目</dt>
                <dd>{{ sourceStats.items }}</dd>
              </div>
              <div>
                <dt>字元</dt>
                <dd>{{ sourceStats.characters }}</dd>
              </div>
            </dl>
          </section>

          <section class="duplicate-items-panel" aria-label="輸出去重結果">
            <div class="duplicate-items-panel__header">
              <div>
                <p class="duplicate-items-panel__eyebrow">Output</p>
                <h2>唯一項目</h2>
              </div>
              <button
                class="button button--primary duplicate-items-panel__copy"
                type="button"
                aria-label="複製結果"
                :title="copyState === 'copied' ? '已複製' : '複製結果'"
                :disabled="!output"
                @click="copyOutput"
              >
                <span aria-hidden="true">{{ copyState === 'copied' ? '✓' : '⧉' }}</span>
              </button>
            </div>

            <textarea
              class="duplicate-items-textarea duplicate-items-textarea--output"
              :value="output"
              readonly
              spellcheck="false"
              aria-label="去重後項目"
            ></textarea>

            <dl class="duplicate-items-stats">
              <div>
                <dt>項目</dt>
                <dd>{{ outputStats.items }}</dd>
              </div>
              <div>
                <dt>字元</dt>
                <dd>{{ outputStats.characters }}</dd>
              </div>
            </dl>
          </section>
        </main>

        <aside class="duplicate-items-sidebar" aria-label="去重設定">
          <div class="duplicate-items-status" :data-active="source.length > 0">
            <span class="duplicate-items-status__dot" aria-hidden="true"></span>
            <span>{{ statusLabel }}</span>
          </div>

          <div class="duplicate-items-settings">
            <SwitchControl v-model="trimItems" label="修剪空白" description="移除每列前後空白再比對" />
            <SwitchControl v-model="ignoreEmptyItems" label="忽略空白列" description="空白項目不輸出" />
            <SwitchControl v-model="ignoreCase" label="不分大小寫" description="Apple 與 apple 視為相同" />
          </div>

          <dl class="duplicate-items-summary">
            <div>
              <dt>原始項目</dt>
              <dd>{{ stats.sourceItems }}</dd>
            </div>
            <div>
              <dt>唯一項目</dt>
              <dd>{{ stats.outputItems }}</dd>
            </div>
            <div>
              <dt>重複項目</dt>
              <dd>{{ stats.duplicateItems }}</dd>
            </div>
            <div>
              <dt>略過空白</dt>
              <dd>{{ stats.skippedEmptyItems }}</dd>
            </div>
          </dl>

          <p v-if="copyState === 'failed'" class="duplicate-items-feedback">
            無法存取剪貼簿，請手動選取輸出內容複製。
          </p>
        </aside>
      </div>
    </section>
  </section>
</template>

<style scoped>
.duplicate-items-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1440px;
  margin: 0 auto;
}

.duplicate-items-page__header h1 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 2.4rem;
  line-height: 1.05;
  letter-spacing: 0;
}

.duplicate-items-workbench {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.duplicate-items-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.duplicate-items-toolbar__group {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.duplicate-items-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  min-height: 620px;
}

.duplicate-items-editor__main {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.duplicate-items-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-right: 1px solid var(--color-border);
}

.duplicate-items-panel:nth-child(2) {
  border-right: 0;
}

.duplicate-items-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 76px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.duplicate-items-panel__header h2 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 1rem;
  letter-spacing: 0;
}

.duplicate-items-panel__eyebrow {
  margin: 0 0 2px;
  color: var(--color-text-soft);
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.duplicate-items-panel__copy {
  display: grid;
  width: 40px;
  min-width: 40px;
  padding: 0;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 1.05rem;
}

.duplicate-items-textarea {
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

.duplicate-items-textarea--output {
  color: var(--color-primary-strong);
}

.duplicate-items-textarea:focus {
  box-shadow: inset 0 0 0 2px var(--color-focus);
}

.duplicate-items-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.duplicate-items-stats div,
.duplicate-items-summary div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.duplicate-items-stats dt,
.duplicate-items-summary dt {
  color: var(--color-text-muted);
  font-weight: 700;
}

.duplicate-items-stats dd,
.duplicate-items-summary dd {
  margin: 0;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-weight: 800;
}

.duplicate-items-sidebar {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  padding: var(--space-4);
  border-left: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.duplicate-items-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  background: var(--color-surface);
  font-weight: 850;
}

.duplicate-items-status[data-active='true'] {
  color: var(--color-success-strong);
}

.duplicate-items-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.duplicate-items-settings,
.duplicate-items-summary {
  display: grid;
  gap: var(--space-2);
}

.duplicate-items-summary {
  margin: 0;
}

.duplicate-items-feedback {
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
  line-height: 1;
}

.button span,
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
  .duplicate-items-editor {
    grid-template-columns: 1fr;
  }

  .duplicate-items-sidebar {
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }
}

@media (max-width: 820px) {
  .duplicate-items-editor__main {
    grid-template-columns: 1fr;
  }

  .duplicate-items-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .duplicate-items-panel:nth-child(2) {
    border-bottom: 0;
  }

  .duplicate-items-textarea {
    min-height: 300px;
    resize: vertical;
  }
}

@media (max-width: 620px) {
  .duplicate-items-page__header h1 {
    font-size: 2rem;
  }

  .duplicate-items-toolbar__group,
  .duplicate-items-stats,
  .duplicate-items-panel__header {
    align-items: stretch;
    flex-direction: column;
  }

  .icon-button {
    flex: 1 1 38px;
  }
}
</style>
