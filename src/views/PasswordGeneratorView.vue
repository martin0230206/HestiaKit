<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import RangeControl from '../components/forms/RangeControl.vue'
import SegmentedControl from '../components/forms/SegmentedControl.vue'
import SwitchControl from '../components/forms/SwitchControl.vue'
import {
  defaultSymbolCharacters,
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
const passwordElement = ref<HTMLElement | null>(null)
const passwordFontSize = ref('')
let passwordResizeObserver: ResizeObserver | undefined
let passwordFitFrame = 0

const randomLength = ref(20)
const includeUppercase = ref(true)
const includeLowercase = ref(true)
const includeNumbers = ref(true)
const symbolOptions = defaultSymbolCharacters.split('')
const selectedSymbols = ref([...symbolOptions])

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
const displayPassword = computed(() => generatedPassword.value || '請至少啟用一種字元類型')
const selectedSymbolCharacters = computed(() => selectedSymbols.value.join(''))
const strengthLabel = computed(() => {
  const labels = {
    Weak: '偏弱',
    Good: '普通',
    Strong: '強',
    Excellent: '極強',
  }

  return labels[strength.value]
})

function selectAllSymbols() {
  selectedSymbols.value = [...symbolOptions]
}

function clearSymbols() {
  selectedSymbols.value = []
}

function generatePassword() {
  copyState.value = 'idle'
  let nextPassword = ''

  if (mode.value === 'random') {
    nextPassword = generateRandomPassword({
      length: randomLength.value,
      includeUppercase: includeUppercase.value,
      includeLowercase: includeLowercase.value,
      includeNumbers: includeNumbers.value,
      includeSymbols: selectedSymbols.value.length > 0,
      symbols: selectedSymbolCharacters.value,
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

async function fitPasswordToLine() {
  const element = passwordElement.value

  if (!element || !generatedPassword.value) {
    passwordFontSize.value = ''
    return
  }

  passwordFontSize.value = ''
  await nextTick()

  const availableWidth = element.clientWidth

  if (!availableWidth) {
    return
  }

  const computedStyle = window.getComputedStyle(element)
  const maxFontSize = Number.parseFloat(computedStyle.fontSize)
  const minFontSize = Number.parseFloat(computedStyle.getPropertyValue('--password-min-font-size')) || 12
  const overflowRatio = availableWidth / element.scrollWidth

  passwordFontSize.value =
    overflowRatio < 1 ? `${Math.max(minFontSize, maxFontSize * overflowRatio * 0.98).toFixed(2)}px` : ''
}

function schedulePasswordFit() {
  window.cancelAnimationFrame(passwordFitFrame)
  passwordFitFrame = window.requestAnimationFrame(() => {
    void fitPasswordToLine()
  })
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
    selectedSymbolCharacters,
    wordCount,
    separator,
    memorableIncludeNumber,
    memorableCapitalize,
    pinLength,
  ],
  generatePassword,
  { immediate: true },
)

watch(displayPassword, schedulePasswordFit, { flush: 'post' })

onMounted(() => {
  schedulePasswordFit()

  if (passwordElement.value) {
    passwordResizeObserver = new ResizeObserver(schedulePasswordFit)
    passwordResizeObserver.observe(passwordElement.value)
  }
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(passwordFitFrame)
  passwordResizeObserver?.disconnect()
})
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
        <div class="generator__result-copy">
          <p class="generator__label">產生結果</p>
          <p
            ref="passwordElement"
            class="generator__password"
            :class="{ 'generator__password--empty': !generatedPassword }"
            :style="{ fontSize: passwordFontSize }"
          >
            {{ displayPassword }}
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
          </div>

          <fieldset class="symbol-picker">
            <legend>符號</legend>
            <div class="symbol-picker__header">
              <span>{{ selectedSymbols.length ? `已選 ${selectedSymbols.length} 個` : '未使用符號' }}</span>
              <div class="symbol-picker__actions">
                <button class="symbol-picker__action" type="button" @click="selectAllSymbols">
                  全選
                </button>
                <button class="symbol-picker__action" type="button" @click="clearSymbols">清除</button>
              </div>
            </div>

            <div class="symbol-picker__options">
              <label
                v-for="symbol in symbolOptions"
                :key="symbol"
                class="symbol-picker__option"
                :class="{ 'symbol-picker__option--active': selectedSymbols.includes(symbol) }"
              >
                <input v-model="selectedSymbols" type="checkbox" :value="symbol" />
                <span>{{ symbol }}</span>
              </label>
            </div>
          </fieldset>
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

.generator__result-copy {
  min-width: 0;
}

.generator__password {
  --password-min-font-size: 0.25rem;

  margin: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--color-text-strong);
  font-family: var(--font-mono);
  font-size: clamp(1.4rem, 3vw, 2.35rem);
  line-height: 1.18;
  text-overflow: clip;
  white-space: nowrap;
}

.generator__password--empty {
  overflow-wrap: anywhere;
  color: var(--color-danger);
  font-family: inherit;
  font-size: 1rem;
  white-space: normal;
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

.symbol-picker {
  display: grid;
  gap: var(--space-3);
  padding: 0;
  border: 0;
  margin: 0;
}

.symbol-picker legend {
  margin-bottom: var(--space-3);
  color: var(--color-text-strong);
  font-weight: 750;
}

.symbol-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-muted);
  font-size: 0.92rem;
}

.symbol-picker__actions {
  display: flex;
  gap: var(--space-2);
}

.symbol-picker__action {
  min-height: 34px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-strong);
  background: var(--color-surface);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 750;
  cursor: pointer;
}

.symbol-picker__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(42px, 1fr));
  gap: var(--space-2);
}

.symbol-picker__option {
  display: grid;
  place-items: center;
  min-height: 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: var(--color-surface);
  font-family: var(--font-mono);
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.symbol-picker__option--active {
  border-color: var(--color-primary);
  color: var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.symbol-picker__option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.symbol-picker__action:focus-visible,
.symbol-picker__option:focus-within {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
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

  .symbol-picker__header {
    align-items: stretch;
    flex-direction: column;
  }

  .symbol-picker__action {
    flex: 1;
  }
}
</style>
