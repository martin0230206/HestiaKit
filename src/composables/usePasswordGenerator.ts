import { computed, ref, watch } from 'vue'
import {
  defaultSymbolCharacters,
  estimatePasswordStrength,
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
  { label: 'PIN', value: 'pin' },
]

const symbolOptions = defaultSymbolCharacters.split('')
const storageKey = 'hestiakit-password-generator'

interface StoredPasswordGeneratorState {
  mode?: PasswordMode
  randomLength?: number
  includeUppercase?: boolean
  includeLowercase?: boolean
  includeNumbers?: boolean
  includeSymbols?: boolean
  selectedSymbols?: string[]
  pinLength?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readStoredState(): StoredPasswordGeneratorState {
  try {
    const storedState = window.localStorage.getItem(storageKey)
    const parsedState = storedState ? JSON.parse(storedState) : undefined

    return parsedState && typeof parsedState === 'object' ? parsedState : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: StoredPasswordGeneratorState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function usePasswordGenerator() {
  const storedState = readStoredState()
  const storedMode = storedState.mode === 'pin' ? 'pin' : 'random'
  const storedSymbols = Array.isArray(storedState.selectedSymbols)
    ? storedState.selectedSymbols.filter((symbol) => symbolOptions.includes(symbol))
    : [...symbolOptions]

  const mode = ref<PasswordMode>(storedMode)
  const generatedPassword = ref('')
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
  const randomLength = ref(clamp(Number(storedState.randomLength) || 32, 8, 64))
  const includeUppercase = ref(storedState.includeUppercase ?? true)
  const includeLowercase = ref(storedState.includeLowercase ?? true)
  const includeNumbers = ref(storedState.includeNumbers ?? true)
  const includeSymbols = ref(storedState.includeSymbols ?? true)
  const selectedSymbols = ref(storedSymbols)

  const pinLength = ref(clamp(Number(storedState.pinLength) || 6, 4, 12))

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
        includeSymbols: includeSymbols.value && selectedSymbols.value.length > 0,
        symbols: selectedSymbolCharacters.value,
      })
    } else {
      nextPassword = generatePinPassword({ length: pinLength.value })
    }

    generatedPassword.value = nextPassword
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
      randomLength,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      selectedSymbolCharacters,
      pinLength,
    ],
    generatePassword,
    { immediate: true },
  )

  watch(
    [
      mode,
      randomLength,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      selectedSymbolCharacters,
      pinLength,
    ],
    () => {
      writeStoredState({
        mode: mode.value,
        randomLength: randomLength.value,
        includeUppercase: includeUppercase.value,
        includeLowercase: includeLowercase.value,
        includeNumbers: includeNumbers.value,
        includeSymbols: includeSymbols.value,
        selectedSymbols: selectedSymbols.value,
        pinLength: pinLength.value,
      })
    },
    { immediate: true },
  )

  return {
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
    selectAllSymbols,
    selectedSymbols,
    strength,
    strengthLabel,
    symbolOptions,
  }
}
