import type { Component } from 'vue'
import JsonViewerView from '../views/JsonViewerView.vue'
import PasswordGeneratorView from '../views/PasswordGeneratorView.vue'

export interface ToolDefinition {
  name: string
  path: string
  label: string
  icon: string
  component: Component
}

export const tools: ToolDefinition[] = [
  {
    name: 'password-generator',
    path: '',
    label: '密碼產生器',
    icon: '＊',
    component: PasswordGeneratorView,
  },
  {
    name: 'json-viewer',
    path: 'json-viewer',
    label: 'JSON 檢視器',
    icon: '{ }',
    component: JsonViewerView,
  },
]
