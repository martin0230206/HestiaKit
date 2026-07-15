import type { Component } from 'vue'
import {
  BinaryIcon,
  BracesIcon,
  ClipboardTypeIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  HashIcon,
  KeyRoundIcon,
  ListFilterIcon,
  StampIcon,
  TablePropertiesIcon,
} from '@lucide/vue'
import Base64View from '../views/Base64View.vue'
import ClipboardMarkdownView from '../views/ClipboardMarkdownView.vue'
import CsvTableView from '../views/CsvTableView.vue'
import DuplicateItemsView from '../views/DuplicateItemsView.vue'
import JsonEditorView from '../views/JsonEditorView.vue'
import JsonMarkdownTableView from '../views/JsonMarkdownTableView.vue'
import Md5View from '../views/Md5View.vue'
import PasswordGeneratorView from '../views/PasswordGeneratorView.vue'
import PdfImageConverterView from '../views/PdfImageConverterView.vue'
import PdfWatermarkView from '../views/PdfWatermarkView.vue'

export interface ToolCategoryDefinition {
  id: string
  label: string
}

export interface ToolDefinition {
  name: string
  path: string
  label: string
  icon: Component
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
    id: 'data-text',
    label: '資料與文字',
  },
  {
    id: 'pdf',
    label: 'PDF 工具',
  },
]

export const tools: ToolDefinition[] = [
  {
    name: 'password-generator',
    path: '',
    label: '密碼產生器',
    icon: KeyRoundIcon,
    categoryId: 'security',
    component: PasswordGeneratorView,
  },
  {
    name: 'base64',
    path: 'base64',
    label: 'Base64',
    icon: BinaryIcon,
    categoryId: 'encoding',
    component: Base64View,
  },
  {
    name: 'md5',
    path: 'md5',
    label: 'MD5',
    icon: HashIcon,
    categoryId: 'encoding',
    component: Md5View,
  },
  {
    name: 'json-editor',
    path: 'json-editor',
    label: 'JSON 編輯器',
    icon: BracesIcon,
    categoryId: 'data-text',
    component: JsonEditorView,
  },
  {
    name: 'duplicate-items',
    path: 'duplicate-items',
    label: '去除重複項目',
    icon: ListFilterIcon,
    categoryId: 'data-text',
    component: DuplicateItemsView,
  },
  {
    name: 'json-markdown-table',
    path: 'json-markdown-table',
    label: 'JSON 轉表格',
    icon: TablePropertiesIcon,
    categoryId: 'data-text',
    component: JsonMarkdownTableView,
  },
  {
    name: 'csv-table',
    path: 'csv-table',
    label: 'CSV 表格檢視器',
    icon: FileSpreadsheetIcon,
    categoryId: 'data-text',
    component: CsvTableView,
  },
  {
    name: 'clipboard-markdown',
    path: 'clipboard-markdown',
    label: '剪貼簿轉 Markdown',
    icon: ClipboardTypeIcon,
    categoryId: 'data-text',
    component: ClipboardMarkdownView,
  },
  {
    name: 'pdf-image-converter',
    path: 'pdf-image-converter',
    label: 'PDF 轉圖片',
    icon: FileImageIcon,
    categoryId: 'pdf',
    component: PdfImageConverterView,
  },
  {
    name: 'pdf-watermark',
    path: 'pdf-watermark',
    label: 'PDF 增加浮水印',
    icon: StampIcon,
    categoryId: 'pdf',
    component: PdfWatermarkView,
  },
]
