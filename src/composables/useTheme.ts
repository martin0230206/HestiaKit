import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'
export type AppliedTheme = 'light' | 'dark'
export type DarkAccentPreference =
  | 'amber'
  | 'graphite'
  | 'midnight'
  | 'spruce'
  | 'moss'
  | 'mist'
  | 'emerald'
  | 'cyan'
  | 'violet'
  | 'rose'

const storageKey = 'hestiakit-theme'
const accentStorageKey = 'hestiakit-dark-accent'
const preference = ref<ThemePreference>('system')
const accentPreference = ref<DarkAccentPreference>('graphite')
const systemTheme = ref<AppliedTheme>('light')

const appliedTheme = computed<AppliedTheme>(() => {
  if (preference.value === 'system') {
    return systemTheme.value
  }

  return preference.value
})

function updateDocumentTheme() {
  document.documentElement.dataset.theme = appliedTheme.value
  document.documentElement.dataset.accent = accentPreference.value
  document.documentElement.style.colorScheme = appliedTheme.value
}

function readStoredPreference() {
  const storedPreference = window.localStorage.getItem(storageKey)

  if (storedPreference === 'system' || storedPreference === 'light' || storedPreference === 'dark') {
    preference.value = storedPreference
  }
}

function readStoredAccentPreference() {
  const storedAccentPreference = window.localStorage.getItem(accentStorageKey)

  if (
    storedAccentPreference === 'amber' ||
    storedAccentPreference === 'graphite' ||
    storedAccentPreference === 'midnight' ||
    storedAccentPreference === 'spruce' ||
    storedAccentPreference === 'moss' ||
    storedAccentPreference === 'mist' ||
    storedAccentPreference === 'emerald' ||
    storedAccentPreference === 'cyan' ||
    storedAccentPreference === 'violet' ||
    storedAccentPreference === 'rose'
  ) {
    accentPreference.value = storedAccentPreference
  }
}

function updateSystemTheme(prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches) {
  systemTheme.value = prefersDark ? 'dark' : 'light'
}

export function useTheme() {
  let mediaQuery: MediaQueryList | undefined

  function handleSystemThemeChange(event: MediaQueryListEvent) {
    updateSystemTheme(event.matches)
    updateDocumentTheme()
  }

  onMounted(() => {
    readStoredPreference()
    readStoredAccentPreference()
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    updateSystemTheme(mediaQuery.matches)
    updateDocumentTheme()
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  })

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', handleSystemThemeChange)
  })

  function setTheme(nextPreference: ThemePreference) {
    preference.value = nextPreference
    window.localStorage.setItem(storageKey, nextPreference)
    updateDocumentTheme()
  }

  function setAccent(nextAccentPreference: DarkAccentPreference) {
    accentPreference.value = nextAccentPreference
    window.localStorage.setItem(accentStorageKey, nextAccentPreference)
    updateDocumentTheme()
  }

  return {
    accentPreference,
    appliedTheme,
    preference,
    setAccent,
    setTheme,
  }
}
