<script setup lang="ts">
import { computed } from 'vue'
import {
  getJsonValueKind,
  parseJsonEditableValue,
  toJsonTreeChildPath,
  type JsonValueKind,
} from '../../utils/jsonEditor'

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
  const input = event.target as HTMLInputElement
  const nextValue = parseJsonEditableValue(input.value)

  if (!Object.is(nextValue, props.value)) {
    props.updateValue(props.path, nextValue)
  }
}
</script>

<template>
  <div class="json-tree-node" :style="{ '--tree-depth': depth ?? 0 }">
    <div class="json-tree-node__row" :data-kind="kind" :data-path="path">
      <button
        v-if="isExpandable"
        class="json-tree-node__toggle"
        type="button"
        :aria-label="isExpanded ? '收合節點' : '展開節點'"
        :title="isExpanded ? '收合' : '展開'"
        @click="togglePath(path)"
      >
        {{ isExpanded ? '▾' : '▸' }}
      </button>
      <span v-else class="json-tree-node__spacer" aria-hidden="true"></span>

      <input
        v-if="canEditKey"
        class="json-tree-node__key-input"
        type="text"
        :value="keyLabel"
        aria-label="編輯 key"
        spellcheck="false"
        autocomplete="off"
        @change="commitKey"
        @keydown.enter.prevent="commitKey"
      />
      <span v-else class="json-tree-node__key">{{ keyLabel }}</span>
      <span class="json-tree-node__type">{{ kind }}</span>
      <input
        v-if="canEditValue"
        class="json-tree-node__value-input"
        type="text"
        :value="editableValueText"
        aria-label="編輯 value"
        spellcheck="false"
        autocomplete="off"
        @change="commitValue"
        @keydown.enter.prevent="commitValue"
      />
      <span v-else class="json-tree-node__summary">{{ summary }}</span>

      <span class="json-tree-node__actions">
        <button
          v-if="canAddItem"
          class="json-tree-node__action"
          type="button"
          aria-label="新增項目"
          title="新增項目"
          @click="addItem(path)"
        >
          +
        </button>
        <span v-else class="json-tree-node__action-spacer" aria-hidden="true"></span>
        <button
          v-if="canDeleteItem"
          class="json-tree-node__action json-tree-node__action--danger"
          type="button"
          aria-label="刪除項目"
          title="刪除項目"
          @click="deleteItem(path)"
        >
          ×
        </button>
        <span v-else class="json-tree-node__action-spacer" aria-hidden="true"></span>
      </span>
    </div>

    <div v-if="isExpandable && isExpanded" class="json-tree-node__children">
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

<style scoped>
.json-tree-node {
  display: grid;
}

.json-tree-node__row {
  display: grid;
  grid-template-columns: 28px minmax(90px, 0.75fr) minmax(76px, 0.35fr) minmax(0, 1.4fr) 62px;
  align-items: center;
  gap: var(--space-2);
  min-width: 700px;
  min-height: 34px;
  padding: 0 var(--space-3) 0 calc(var(--space-3) + var(--tree-depth) * 22px);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 0.9rem;
}

.json-tree-node__row[data-kind='object'],
.json-tree-node__row[data-kind='array'] {
  background: var(--color-surface-muted);
}

.json-tree-node__toggle {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary-strong);
  background: var(--color-surface);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.json-tree-node__toggle:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.json-tree-node__spacer {
  width: 24px;
  height: 24px;
}

.json-tree-node__key,
.json-tree-node__key-input {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-strong);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-tree-node__type {
  color: var(--color-text-soft);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.json-tree-node__summary,
.json-tree-node__value-input {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-tree-node__key-input,
.json-tree-node__value-input {
  width: 100%;
  height: 26px;
  padding: 0 var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  font: inherit;
}

.json-tree-node__key-input {
  color: var(--color-text-strong);
  font-weight: 800;
}

.json-tree-node__value-input {
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.json-tree-node__key-input:hover,
.json-tree-node__value-input:hover {
  border-color: var(--color-border);
  background: var(--color-surface);
}

.json-tree-node__key-input:focus,
.json-tree-node__value-input:focus {
  border-color: var(--color-focus);
  background: var(--color-surface);
  outline: none;
  box-shadow: 0 0 0 1px var(--color-focus);
}

.json-tree-node__actions {
  display: flex;
  justify-content: flex-end;
  gap: 3px;
  min-width: 0;
}

.json-tree-node__action,
.json-tree-node__action-spacer {
  width: 26px;
  height: 26px;
}

.json-tree-node__action {
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary-strong);
  background: var(--color-surface);
  font: inherit;
  font-family: var(--font-mono);
  font-weight: 900;
  cursor: pointer;
}

.json-tree-node__action:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.json-tree-node__action--danger {
  color: var(--color-danger);
}

.json-tree-node__action:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .json-tree-node__row {
    grid-template-columns: 28px minmax(72px, 0.8fr) minmax(0, 1.2fr) 62px;
  }

  .json-tree-node__type {
    display: none;
  }
}
</style>
