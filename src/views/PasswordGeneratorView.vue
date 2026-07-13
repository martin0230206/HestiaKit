<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CheckIcon, ChevronDownIcon, ClipboardIcon, PlusIcon, RefreshCwIcon, RotateCcwIcon } from '@lucide/vue'
import RangeControl from '@/components/forms/RangeControl.vue'
import SegmentedControl from '@/components/forms/SegmentedControl.vue'
import SwitchControl from '@/components/forms/SwitchControl.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { usePasswordGenerator } from '@/composables/usePasswordGenerator'

const {
  addCustomSymbols,
  clearSymbols,
  copyPassword,
  copyState,
  displayPassword,
  generatePassword,
  generatedPassword,
  includeLowercase,
  includeNumbers,
  includeSymbols,
  includeUppercase,
  mode,
  modeOptions,
  pinLength,
  randomLength,
  resetSettings,
  selectAllSymbols,
  selectedSymbols,
  strength,
  strengthLabel,
  symbolOptions,
} = usePasswordGenerator()

const symbolPickerStorageKey = 'hestiakit-password-generator-symbol-picker-open'
const isSymbolPickerOpen = ref(readStoredSymbolPickerState())
const customSymbolInput = ref('')
const customSymbolFeedback = ref('')
const passwordElement = ref<HTMLElement | null>(null)
const passwordFontSize = ref('')
let passwordResizeObserver: ResizeObserver | undefined
let passwordFitFrame = 0

function readStoredSymbolPickerState() {
  try {
    return window.localStorage.getItem(symbolPickerStorageKey) === 'true'
  } catch {
    return false
  }
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

  if (!availableWidth) return

  const computedStyle = window.getComputedStyle(element)
  const maxFontSize = Number.parseFloat(computedStyle.fontSize)
  const minFontSize = Number.parseFloat(computedStyle.getPropertyValue('--password-min-font-size')) || 12
  const overflowRatio = availableWidth / element.scrollWidth

  passwordFontSize.value =
    overflowRatio < 1 ? `${Math.max(minFontSize, maxFontSize * overflowRatio * 0.98).toFixed(2)}px` : ''
}

function schedulePasswordFit() {
  window.cancelAnimationFrame(passwordFitFrame)
  passwordFitFrame = window.requestAnimationFrame(() => void fitPasswordToLine())
}

function addCustomSymbolOptions() {
  const input = customSymbolInput.value

  if (!input.trim()) {
    customSymbolFeedback.value = ''
    return
  }

  const selectedCount = selectedSymbols.value.length
  const addedSymbols = addCustomSymbols(input)
  const selectedExistingSymbol = selectedSymbols.value.length > selectedCount
  customSymbolInput.value = ''

  if (addedSymbols.length) {
    customSymbolFeedback.value = `已加入 ${addedSymbols.join(' ')}`
    return
  }

  customSymbolFeedback.value = selectedExistingSymbol ? '已選取既有符號' : '沒有可加入的新符號'
}

function setSymbolSelected(symbol: string, checked: boolean | 'indeterminate') {
  if (checked === true && !selectedSymbols.value.includes(symbol)) {
    selectedSymbols.value = [...selectedSymbols.value, symbol]
  } else if (checked !== true) {
    selectedSymbols.value = selectedSymbols.value.filter((item) => item !== symbol)
  }
}

function resetPasswordGeneratorSettings() {
  resetSettings()
  isSymbolPickerOpen.value = false
  customSymbolInput.value = ''
  customSymbolFeedback.value = ''
}

watch(displayPassword, schedulePasswordFit, { flush: 'post' })
watch(isSymbolPickerOpen, (isOpen) => {
  try {
    window.localStorage.setItem(symbolPickerStorageKey, String(isOpen))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
})

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
  <section class="mx-auto grid w-full max-w-5xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">密碼產生器</h1>
      <p class="text-sm text-muted-foreground">使用瀏覽器安全亂數產生密碼或 PIN，設定只保存在這台裝置。</p>
    </header>

    <Card class="relative overflow-hidden bg-card">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-brand-glow),transparent_45%)]"></div>
      <CardContent class="relative grid gap-5 px-4 py-2 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div class="min-w-0">
          <p class="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">產生結果</p>
          <p
            ref="passwordElement"
            class="max-w-full overflow-hidden whitespace-nowrap font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            :class="{ 'whitespace-normal text-base text-destructive': !generatedPassword }"
            :style="{ '--password-min-font-size': '12px', fontSize: passwordFontSize }"
          >
            {{ displayPassword }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 md:justify-end">
          <Badge :variant="strength === 'Strong' || strength === 'Excellent' ? 'secondary' : 'outline'">{{ strengthLabel }}</Badge>
          <Button variant="outline" @click="generatePassword"><RefreshCwIcon />重新產生</Button>
          <Button :disabled="!generatedPassword" @click="copyPassword">
            <CheckIcon v-if="copyState === 'copied'" /><ClipboardIcon v-else />
            {{ copyState === 'copied' ? '已複製' : '複製' }}
          </Button>
        </div>

        <p v-if="copyState === 'failed'" class="text-sm text-destructive md:col-span-2">無法存取剪貼簿，請手動選取密碼複製。</p>
      </CardContent>
    </Card>

    <Card aria-label="密碼設定">
      <CardHeader class="flex-row items-center justify-between border-b px-4 pb-4 sm:px-6">
        <div><CardTitle>產生設定</CardTitle><p class="mt-1 text-xs text-muted-foreground">調整類型、長度與使用字元</p></div>
        <Button variant="ghost" size="sm" @click="resetPasswordGeneratorSettings"><RotateCcwIcon />重置</Button>
      </CardHeader>

      <CardContent class="grid gap-6 px-4 sm:px-6">
        <SegmentedControl v-model="mode" label="密碼類型" :options="modeOptions" />

        <div v-if="mode === 'random'" class="grid gap-6">
          <RangeControl v-model="randomLength" label="長度" :min="8" :max="64" suffix=" 字元" />

          <div class="grid gap-3 sm:grid-cols-2">
            <SwitchControl v-model="includeUppercase" label="大寫字母" />
            <SwitchControl v-model="includeLowercase" label="小寫字母" />
            <SwitchControl v-model="includeNumbers" label="數字" />
            <SwitchControl v-model="includeSymbols" label="符號" :description="selectedSymbols.length ? `已選 ${selectedSymbols.length} 個` : '未選擇符號'" />
          </div>

          <Collapsible v-if="includeSymbols" v-model:open="isSymbolPickerOpen" class="rounded-xl border bg-muted/20">
            <CollapsibleTrigger as-child>
              <Button variant="ghost" class="h-12 w-full justify-between rounded-xl px-4">
                <span>自訂符號</span>
                <span class="ml-auto text-xs text-muted-foreground">{{ selectedSymbols.length ? `已選 ${selectedSymbols.length} 個` : '未選擇符號' }}</span>
                <ChevronDownIcon class="transition-transform" :class="{ 'rotate-180': isSymbolPickerOpen }" />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent class="grid gap-4 border-t p-4">
              <div class="flex gap-2">
                <Button variant="outline" size="sm" @click="selectAllSymbols">全選</Button>
                <Button variant="outline" size="sm" @click="clearSymbols">清除</Button>
              </div>

              <form class="grid gap-2" @submit.prevent="addCustomSymbolOptions">
                <label class="text-sm font-medium" for="custom-symbol-input">加入符號</label>
                <div class="flex gap-2">
                  <Input id="custom-symbol-input" v-model="customSymbolInput" class="font-mono" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="32" placeholder="例如 & / \ |" />
                  <Button type="submit" variant="outline"><PlusIcon />加入</Button>
                </div>
                <p v-if="customSymbolFeedback" class="text-xs text-muted-foreground">{{ customSymbolFeedback }}</p>
              </form>

              <div class="grid grid-cols-[repeat(auto-fit,minmax(42px,1fr))] gap-2">
                <label
                  v-for="symbol in symbolOptions"
                  :key="symbol"
                  class="flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-background px-2 font-mono text-sm transition-colors hover:bg-muted"
                  :class="{ 'border-primary bg-accent text-accent-foreground': selectedSymbols.includes(symbol) }"
                >
                  <Checkbox
                    class="sr-only"
                    :model-value="selectedSymbols.includes(symbol)"
                    @update:model-value="setSymbolSelected(symbol, $event)"
                  />
                  {{ symbol }}
                </label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div v-else>
          <RangeControl v-model="pinLength" label="PIN 長度" :min="4" :max="12" suffix=" 位" />
        </div>
      </CardContent>
    </Card>
  </section>
</template>
