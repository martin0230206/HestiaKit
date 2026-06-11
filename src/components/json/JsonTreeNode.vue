<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({
  name: 'JsonTreeNode',
})

const props = withDefaults(
  defineProps<{
    nodeKey?: string
    value: unknown
    depth?: number
  }>(),
  {
    depth: 0,
  },
)

const expanded = ref(props.depth < 2)

const valueType = computed(() => {
  if (Array.isArray(props.value)) {
    return 'array'
  }

  if (props.value === null) {
    return 'null'
  }

  return typeof props.value
})

const childEntries = computed<Array<[string, unknown]>>(() => {
  if (Array.isArray(props.value)) {
    return props.value.map((item, index) => [String(index), item])
  }

  if (props.value !== null && typeof props.value === 'object') {
    return Object.entries(props.value as Record<string, unknown>)
  }

  return []
})

const hasChildren = computed(() => childEntries.value.length > 0)

const summary = computed(() => {
  if (Array.isArray(props.value)) {
    return `Array(${props.value.length})`
  }

  if (props.value !== null && typeof props.value === 'object') {
    const keyCount = Object.keys(props.value as Record<string, unknown>).length
    return `Object(${keyCount})`
  }

  return ''
})

const primitiveValue = computed(() => {
  if (typeof props.value === 'string') {
    return JSON.stringify(props.value)
  }

  return String(props.value)
})
</script>

<template>
  <li class="json-tree-node" :style="{ '--json-tree-depth': depth }">
    <div class="json-tree-node__row">
      <button
        v-if="hasChildren"
        class="json-tree-node__toggle"
        type="button"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? '−' : '+' }}
      </button>
      <span v-else class="json-tree-node__toggle-spacer" aria-hidden="true"></span>

      <span v-if="nodeKey !== undefined" class="json-tree-node__key">
        {{ JSON.stringify(nodeKey) }}
      </span>
      <span v-if="nodeKey !== undefined" class="json-tree-node__punctuation">:</span>

      <span v-if="hasChildren" class="json-tree-node__summary">{{ summary }}</span>
      <span v-else class="json-tree-node__primitive" :data-type="valueType">{{ primitiveValue }}</span>
    </div>

    <ol v-if="hasChildren && expanded" class="json-tree-node__children">
      <JsonTreeNode
        v-for="[childKey, childValue] in childEntries"
        :key="childKey"
        :node-key="childKey"
        :value="childValue"
        :depth="depth + 1"
      />
    </ol>
  </li>
</template>

<style scoped>
.json-tree-node {
  list-style: none;
}

.json-tree-node__row {
  display: flex;
  min-height: 30px;
  align-items: center;
  gap: var(--space-2);
  padding-left: calc(var(--json-tree-depth) * 18px);
  border-radius: var(--radius-sm);
}

.json-tree-node__row:hover {
  background: var(--color-surface-muted);
}

.json-tree-node__toggle,
.json-tree-node__toggle-spacer {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
}

.json-tree-node__toggle {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-strong);
  background: var(--color-surface);
  cursor: pointer;
}

.json-tree-node__toggle:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.json-tree-node__key {
  color: var(--color-primary-strong);
  font-weight: 800;
}

.json-tree-node__punctuation {
  color: var(--color-text-soft);
}

.json-tree-node__summary {
  color: var(--color-text-muted);
  font-weight: 700;
}

.json-tree-node__primitive {
  overflow-wrap: anywhere;
  color: var(--color-text-strong);
}

.json-tree-node__primitive[data-type='string'] {
  color: var(--color-success-strong);
}

.json-tree-node__primitive[data-type='number'] {
  color: var(--color-primary-strong);
}

.json-tree-node__primitive[data-type='boolean'] {
  color: var(--color-danger);
}

.json-tree-node__primitive[data-type='null'] {
  color: var(--color-text-soft);
  font-style: italic;
}

.json-tree-node__children {
  padding: 0;
  margin: 0;
}
</style>
