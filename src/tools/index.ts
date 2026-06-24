import type { Component } from 'vue'
import Base64View from '../views/Base64View.vue'
import ClipboardMarkdownView from '../views/ClipboardMarkdownView.vue'
import DuplicateItemsView from '../views/DuplicateItemsView.vue'
import JsonEditorView from '../views/JsonEditorView.vue'
import JsonMarkdownTableView from '../views/JsonMarkdownTableView.vue'
import Md5View from '../views/Md5View.vue'
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
    name: 'md5',
    path: 'md5',
    label: 'MD5',
    icon: '#',
    categoryId: 'encoding',
    component: Md5View,
  },
  {
    name: 'json-editor',
    path: 'json-editor',
    label: 'JSON 編輯器',
    icon: '{}',
    categoryId: 'format',
    component: JsonEditorView,
  },
  {
    name: 'duplicate-items',
    path: 'duplicate-items',
    label: '去除重複項目',
    icon: '1x',
    categoryId: 'format',
    component: DuplicateItemsView,
  },
  {
    name: 'json-markdown-table',
    path: 'json-markdown-table',
    label: 'JSON 轉表格',
    icon: '| |',
    categoryId: 'format',
    component: JsonMarkdownTableView,
  },
  {
    name: 'clipboard-markdown',
    path: 'clipboard-markdown',
    label: '剪貼簿轉 Markdown',
    icon: 'MD',
    categoryId: 'format',
    component: ClipboardMarkdownView,
  },
]
