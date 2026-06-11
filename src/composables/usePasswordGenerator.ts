import { computed, ref, watch } from 'vue'
import {
  defaultSymbolCharacters,
  encodeBase64Password,
  estimatePasswordStrength,
  generateMemorablePassword,
  generatePinPassword,
  generateRandomPassword,
  type PasswordMode,
} from '../utils/passwordGenerator'

const strengthLabels = {
  Weak: '偏弱',
  Good: '普通',
  Strong: '強',
  Excellent: '極強',
}

const modeOptions: Array<{ label: string; value: PasswordMode }> = [
  { label: '隨機密碼', value: 'random' },
  { label: '好記密碼', value: 'memorable' },
  { label: 'PIN', value: 'pin' },
]

const symbolOptions = defaultSymbolCharacters.split('')

export function usePasswordGenerator() {
  const mode = ref<PasswordMode>('random')
  const generatedPassword = ref('')
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
  const encodeWithBase64 = ref(false)

  const randomLength = ref(20)
  const includeUppercase = ref(true)
  const includeLowercase = ref(true)
  const includeNumbers = ref(true)
  const selectedSymbols = ref([...symbolOptions])

  const wordCount = ref(4)
  const separator = ref('-')
  const memorableIncludeNumber = ref(true)
  const memorableCapitalize = ref(false)

  const pinLength = ref(6)

  const strength = computed(() => estimatePasswordStrength(generatedPassword.value))
  const displayPassword = computed(() => generatedPassword.value || '請至少啟用一種字元類型')
  const selectedSymbolCharacters = computed(() => selectedSymbols.value.join(''))
  const strengthLabel = computed(() => strengthLabels[strength.value])

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

  return {
    clearSymbols,
    copyPassword,
    copyState,
    displayPassword,
    encodeWithBase64,
    generatePassword,
    generatedPassword,
    includeLowercase,
    includeNumbers,
    includeUppercase,
    memorableCapitalize,
    memorableIncludeNumber,
    mode,
    modeOptions,
    pinLength,
    randomLength,
    selectAllSymbols,
    selectedSymbols,
    separator,
    strength,
    strengthLabel,
    symbolOptions,
    wordCount,
  }
}
