<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  getJsonValueKind,
  parseJsonEditableValue,
  toJsonTreeChildPath,
  type JsonValueKind,
} from '@/utils/jsonEditor'

defineOptions({
  name: 'JsonTreeNode',
})

const props = defineProps<{
  value: unknown
  path: string
  expandedPaths: ReadonlySet<string>
  addItem: (path: string) => boolean
  deleteItem: (path: string) => boolean
  togglePath: (path: string) => void
  updateKey: (path: string, nextKey: string) => boolean
  updateValue: (path: string, nextValue: unknown) => boolean
  nodeKey?: string | number
  depth?: number
}>()

const kind = computed(() => getJsonValueKind(props.value))
const isExpanded = computed(() => props.expandedPaths.has(props.path))
const childEntries = computed(() => {
  if (Array.isArray(props.value)) {
    return props.value.map((childValue, index) => ({
      key: index,
      path: toJsonTreeChildPath(props.path, index),
      value: childValue,
    }))
  }

  if (props.value !== null && typeof props.value === 'object') {
    return Object.entries(props.value as Record<string, unknown>).map(([key, childValue]) => ({
      key,
      path: toJsonTreeChildPath(props.path, key),
      value: childValue,
    }))
  }

  return []
})
const isExpandable = computed(() => childEntries.value.length > 0)
const keyLabel = computed(() => (props.nodeKey === undefined ? 'root' : String(props.nodeKey)))
const canEditKey = computed(() => typeof props.nodeKey === 'string')
const canEditValue = computed(() => !Array.isArray(props.value) && (props.value === null || typeof props.value !== 'object'))
const canAddItem = computed(() => Array.isArray(props.value) || (props.value !== null && typeof props.value === 'object'))
const canDeleteItem = computed(() => props.path !== '$')
const editableValueText = computed(() => String(props.value))
const summary = computed(() => getSummary(props.value, kind.value, childEntries.value.length))
const keyCellStyle = computed(() => ({ paddingInlineStart: `${(props.depth ?? 0) * 20 + 8}px` }))

function getSummary(value: unknown, valueKind: JsonValueKind, childCount: number) {
  if (valueKind === 'array') {
    return `Array(${childCount})`
  }

  if (valueKind === 'object') {
    return `Object(${childCount})`
  }

  if (valueKind === 'string') {
    return JSON.stringify(value)
  }

  return String(value)
}

function commitKey(event: Event) {
  if (!canEditKey.value) {
    return
  }

  const input = event.target as HTMLInputElement
  const nextKey = input.value

  if (nextKey === props.nodeKey) {
    return
  }

  if (!props.updateKey(props.path, nextKey)) {
    input.value = keyLabel.value
  }
}

function commitValue(event: Event) {
  const input = event.target as HTMLTextAreaElement
  const nextValue = parseJsonEditableValue(input.value)

  if (!Object.is(nextValue, props.value)) {
    props.updateValue(props.path, nextValue)
  }
}
</script>

<template>
  <div>
    <div
      class="grid min-w-[46rem] grid-cols-[minmax(13rem,0.9fr)_6rem_minmax(16rem,1.2fr)_5rem] items-center border-b text-sm last:border-b-0 hover:bg-muted/30"
      :data-kind="kind"
      :data-path="path"
    >
      <div class="flex min-w-0 items-center gap-1.5 py-2 pr-2" :style="keyCellStyle">
        <Button
          v-if="isExpandable"
          variant="ghost"
          size="icon-xs"
          :aria-label="isExpanded ? '收合節點' : '展開節點'"
          :title="isExpanded ? '收合' : '展開'"
          @click="togglePath(path)"
        >
          <ChevronDownIcon v-if="isExpanded" />
          <ChevronRightIcon v-else />
        </Button>
        <span v-else class="size-6 shrink-0" aria-hidden="true" />

        <Input
          v-if="canEditKey"
          class="h-7 font-mono"
          type="text"
          :model-value="keyLabel"
          aria-label="編輯 key"
          spellcheck="false"
          autocomplete="off"
          @change="commitKey"
          @keydown.enter.prevent="commitKey"
        />
        <code v-else class="min-w-0 truncate font-mono font-medium text-foreground">{{ keyLabel }}</code>
      </div>

      <div class="px-2 py-2">
        <Badge variant="outline" class="font-mono text-[0.7rem]">{{ kind }}</Badge>
      </div>

      <div class="min-w-0 px-2 py-2">
        <Textarea
          v-if="canEditValue"
          class="min-h-7 field-sizing-fixed resize-y py-1 font-mono text-xs leading-5"
          :model-value="editableValueText"
          rows="1"
          aria-label="編輯 value"
          spellcheck="false"
          autocomplete="off"
          wrap="soft"
          @change="commitValue"
          @keydown.enter.prevent="commitValue"
        />
        <code v-else class="block truncate font-mono text-xs text-muted-foreground" :title="summary">{{ summary }}</code>
      </div>

      <div class="flex items-center justify-end gap-1 px-2 py-2">
        <Button v-if="canAddItem" variant="ghost" size="icon-xs" aria-label="新增項目" title="新增項目" @click="addItem(path)">
          <PlusIcon />
        </Button>
        <span v-else class="size-6" aria-hidden="true" />
        <Button v-if="canDeleteItem" variant="destructive" size="icon-xs" aria-label="刪除項目" title="刪除項目" @click="deleteItem(path)">
          <Trash2Icon />
        </Button>
        <span v-else class="size-6" aria-hidden="true" />
      </div>
    </div>

    <div v-if="isExpandable && isExpanded">
      <JsonTreeNode
        v-for="entry in childEntries"
        :key="entry.path"
        :value="entry.value"
        :path="entry.path"
        :node-key="entry.key"
        :expanded-paths="expandedPaths"
        :add-item="addItem"
        :delete-item="deleteItem"
        :toggle-path="togglePath"
        :update-key="updateKey"
        :update-value="updateValue"
        :depth="(depth ?? 0) + 1"
      />
    </div>
  </div>
</template>
