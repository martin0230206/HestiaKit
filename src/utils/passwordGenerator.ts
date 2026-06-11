export type PasswordMode = 'random' | 'pin'

export interface RandomPasswordOptions {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  symbols?: string
}

export interface PinPasswordOptions {
  length: number
}

export type PasswordStrength = 'Weak' | 'Good' | 'Strong' | 'Excellent'

const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const lowercase = 'abcdefghijkmnopqrstuvwxyz'
const numbers = '23456789'
export const defaultSymbolCharacters = '-_.~!@#$%^*+='
const pinNumbers = '0123456789'

function randomIndex(max: number) {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)

  return value[0] % max
}

function pick(source: string) {
  return source[randomIndex(source.length)]
}

function shuffle(characters: string[]) {
  const result = [...characters]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result.join('')
}

export function generateRandomPassword(options: RandomPasswordOptions) {
  const symbolPool = options.includeSymbols ? options.symbols ?? defaultSymbolCharacters : ''
  const pools = [
    options.includeUppercase ? uppercase : '',
    options.includeLowercase ? lowercase : '',
    options.includeNumbers ? numbers : '',
    symbolPool,
  ].filter(Boolean)

  if (pools.length === 0) {
    return ''
  }

  const requiredCharacters = pools.map((pool) => pick(pool))
  const combinedPool = pools.join('')

  while (requiredCharacters.length < options.length) {
    requiredCharacters.push(pick(combinedPool))
  }

  return shuffle(requiredCharacters.slice(0, options.length))
}

export function generatePinPassword(options: PinPasswordOptions) {
  return Array.from({ length: options.length }, () => pick(pinNumbers)).join('')
}

export function estimatePasswordStrength(password: string): PasswordStrength {
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSymbols = /[^a-zA-Z0-9]/.test(password)
  const variety = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length
  const score = password.length + variety * 4

  if (score >= 34) {
    return 'Excellent'
  }

  if (score >= 24) {
    return 'Strong'
  }

  if (score >= 14) {
    return 'Good'
  }

  return 'Weak'
}
