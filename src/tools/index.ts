import type { Component } from 'vue'
import Base64View from '../views/Base64View.vue'
import JsonEditorView from '../views/JsonEditorView.vue'
import PasswordGeneratorView from '../views/PasswordGeneratorView.vue'

export interface ToolCategoryDefinition {
  id: string
  label: string
}

export interface ToolDefinition {
  name: string
  path: string
  label: string
  icon: string
  categoryId: string
  component: Component
}

export const toolCategories: ToolCategoryDefinition[] = [
  {
    id: 'security',
    label: '安全工具',
  },
  {
    id: 'encoding',
    label: '編碼與雜湊',
  },
  {
    id: 'format',
    label: '格式工具',
  },
]

export const tools: ToolDefinition[] = [
  {
    name: 'password-generator',
    path: '',
    label: '密碼產生器',
    icon: '＊',
    categoryId: 'security',
    component: PasswordGeneratorView,
  },
  {
    name: 'base64',
    path: 'base64',
    label: 'Base64',
    icon: '64',
    categoryId: 'encoding',
    component: Base64View,
  },
  {
    name: 'json-editor',
    path: 'json-editor',
    label: 'JSON 編輯器',
    icon: '{}',
    categoryId: 'format',
    component: JsonEditorView,
  },
]
