import { computed, onMounted, ref } from 'vue'

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

function updateSystemTheme(event?: MediaQueryListEvent) {
  systemTheme.value = event?.matches ?? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  onMounted(() => {
    readStoredPreference()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    updateSystemTheme()
    updateDocumentTheme()

    mediaQuery.addEventListener('change', (event) => {
      updateSystemTheme(event)
      updateDocumentTheme()
    })
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
