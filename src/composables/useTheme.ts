import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'
export type AppliedTheme = 'light' | 'dark'

const storageKey = 'hestiakit-theme'
const preference = ref<ThemePreference>('system')
const systemTheme = ref<AppliedTheme>('light')

const appliedTheme = computed<AppliedTheme>(() => {
  if (preference.value === 'system') {
    return systemTheme.value
  }

  return preference.value
})

function updateDocumentTheme() {
  document.documentElement.dataset.theme = appliedTheme.value
  document.documentElement.style.colorScheme = appliedTheme.value
}

function readStoredPreference() {
  const storedPreference = window.localStorage.getItem(storageKey)

  if (storedPreference === 'system' || storedPreference === 'light' || storedPreference === 'dark') {
    preference.value = storedPreference
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

  return {
    appliedTheme,
    preference,
    setTheme,
  }
}
