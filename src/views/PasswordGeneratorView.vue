<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import RangeControl from '../components/forms/RangeControl.vue'
import SegmentedControl from '../components/forms/SegmentedControl.vue'
import SwitchControl from '../components/forms/SwitchControl.vue'
import {
  encodeBase64Password,
  estimatePasswordStrength,
  generateMemorablePassword,
  generatePinPassword,
  generateRandomPassword,
  type PasswordMode,
} from '../utils/passwordGenerator'

const mode = ref<PasswordMode>('random')
const generatedPassword = ref('')
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
const encodeWithBase64 = ref(false)

const randomLength = ref(20)
const includeUppercase = ref(true)
const includeLowercase = ref(true)
const includeNumbers = ref(true)
const includeSymbols = ref(true)

const wordCount = ref(4)
const separator = ref('-')
const memorableIncludeNumber = ref(true)
const memorableCapitalize = ref(false)

const pinLength = ref(6)

const modeOptions: Array<{ label: string; value: PasswordMode }> = [
  { label: '隨機密碼', value: 'random' },
  { label: '好記密碼', value: 'memorable' },
  { label: 'PIN', value: 'pin' },
]

const strength = computed(() => estimatePasswordStrength(generatedPassword.value))
const strengthLabel = computed(() => {
  const labels = {
    Weak: '偏弱',
    Good: '普通',
    Strong: '強',
    Excellent: '極強',
  }

  return labels[strength.value]
})

function generatePassword() {
  copyState.value = 'idle'
  let nextPassword = ''

  if (mode.value === 'random') {
    nextPassword = generateRandomPassword({
      length: randomLength.value,
      includeUppercase: includeUppercase.value,
      includeLowercase: includeLowercase.value,
      includeNumbers: includeNumbers.value,
      includeSymbols: includeSymbols.value,
    })
  } else if (mode.value === 'memorable') {
    nextPassword = generateMemorablePassword({
      wordCount: wordCount.value,
      separator: separator.value,
      includeNumber: memorableIncludeNumber.value,
      capitalize: memorableCapitalize.value,
    })
  } else {
    nextPassword = generatePinPassword({ length: pinLength.value })
  }

  generatedPassword.value = encodeWithBase64.value && nextPassword ? encodeBase64Password(nextPassword) : nextPassword
}

async function copyPassword() {
  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
}

watch(
  [
    mode,
    encodeWithBase64,
    randomLength,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    wordCount,
    separator,
    memorableIncludeNumber,
    memorableCapitalize,
    pinLength,
  ],
  generatePassword,
  { immediate: true },
)
</script>

<template>
  <section class="tool-page">
    <header class="tool-page__header">
      <p class="tool-page__eyebrow">HestiaKit Security</p>
      <div class="tool-page__heading">
        <div>
          <h1>密碼產生器</h1>
        </div>
      </div>
    </header>

    <div class="generator">
      <section class="generator__result" aria-label="產生的密碼">
        <div>
          <p class="generator__label">產生結果</p>
          <p class="generator__password" :class="{ 'generator__password--empty': !generatedPassword }">
            {{ generatedPassword || '請至少啟用一種字元類型' }}
          </p>
        </div>

        <div class="generator__actions">
          <span class="generator__strength" :data-strength="strength">{{ strengthLabel }}</span>
          <button class="button button--ghost" type="button" @click="generatePassword">重新產生</button>
          <button class="button button--primary" type="button" :disabled="!generatedPassword" @click="copyPassword">
            {{ copyState === 'copied' ? '已複製' : '複製' }}
          </button>
        </div>

        <p v-if="copyState === 'failed'" class="generator__feedback">無法存取剪貼簿，請手動選取密碼複製。</p>
      </section>

      <section class="generator__settings" aria-label="密碼設定">
        <SegmentedControl v-model="mode" label="密碼類型" :options="modeOptions" />
        <SwitchControl v-model="encodeWithBase64" label="Base64 編碼" />

        <div v-if="mode === 'random'" class="generator__panel">
          <RangeControl v-model="randomLength" label="長度" :min="8" :max="64" suffix=" 字元" />

          <div class="generator__grid">
            <SwitchControl v-model="includeUppercase" label="大寫字母" />
            <SwitchControl v-model="includeLowercase" label="小寫字母" />
            <SwitchControl v-model="includeNumbers" label="數字" />
            <SwitchControl v-model="includeSymbols" label="符號" />
          </div>
        </div>

        <div v-else-if="mode === 'memorable'" class="generator__panel">
          <RangeControl v-model="wordCount" label="單字數" :min="3" :max="8" suffix=" 個" />

          <label class="field">
            <span>分隔符</span>
            <select v-model="separator">
              <option value="-">連字號 -</option>
              <option value=".">句點 .</option>
              <option value="_">底線 _</option>
              <option value="">不使用</option>
            </select>
          </label>

          <div class="generator__grid">
            <SwitchControl v-model="memorableIncludeNumber" label="加入數字" />
            <SwitchControl v-model="memorableCapitalize" label="首字大寫" />
          </div>
        </div>

        <div v-else class="generator__panel">
          <RangeControl v-model="pinLength" label="PIN 長度" :min="4" :max="12" suffix=" 位" />
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.tool-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1040px;
  margin: 0 auto;
}

.tool-page__header {
  display: grid;
  gap: var(--space-3);
}

.tool-page__eyebrow {
  margin: 0;
  color: var(--color-primary-strong);
  font-size: 0.8rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tool-page__heading h1 {
  margin: 0 0 var(--space-3);
  color: var(--color-text-strong);
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: 1;
  letter-spacing: 0;
}

.generator {
  display: grid;
  gap: var(--space-5);
}

.generator__result,
.generator__settings {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.generator__result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-5);
  align-items: center;
  padding: var(--space-6);
}

.generator__label {
  margin: 0 0 var(--space-2);
  color: var(--color-text-soft);
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.generator__password {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-size: clamp(1.4rem, 3vw, 2.35rem);
  line-height: 1.18;
}

.generator__password--empty {
  color: var(--color-danger);
  font-family: inherit;
  font-size: 1rem;
}

.generator__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.generator__strength {
  min-width: 58px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  color: var(--color-text-strong);
  background: var(--color-surface-muted);
  font-size: 0.85rem;
  font-weight: 800;
  text-align: center;
}

.generator__strength[data-strength='Strong'],
.generator__strength[data-strength='Excellent'] {
  color: var(--color-success-strong);
  background: var(--color-success-soft);
}

.generator__feedback {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--color-danger);
}

.generator__settings {
  display: grid;
  gap: var(--space-6);
  padding: var(--space-6);
}

.generator__panel {
  display: grid;
  gap: var(--space-5);
}

.generator__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.button {
  min-height: 42px;
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

.button:focus-visible,
.field select:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.field {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-strong);
  font-weight: 750;
}

.field select {
  min-height: 42px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  font: inherit;
}

@media (max-width: 760px) {
  .generator__result {
    grid-template-columns: 1fr;
    padding: var(--space-4);
  }

  .generator__actions {
    flex-wrap: wrap;
  }

  .generator__settings {
    padding: var(--space-4);
  }

  .generator__grid {
    grid-template-columns: 1fr;
  }
}
</style>
