<script setup lang="ts">
import { ref } from 'vue'
import {
  ArrowDownAZIcon,
  BracesIcon,
  CheckIcon,
  ClipboardIcon,
  DownloadIcon,
  FileTextIcon,
  FoldVerticalIcon,
  Minimize2Icon,
  SparklesIcon,
  Trash2Icon,
  UnfoldVerticalIcon,
  UploadIcon,
  WandSparklesIcon,
} from '@lucide/vue'
import JsonTreeNode from '@/components/json-editor/JsonTreeNode.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useJsonEditor } from '@/composables/useJsonEditor'

const {
  addTreeItem,
  canRepair,
  clearJson,
  collapseTree,
  compactJson,
  copyJson,
  copyState,
  deleteTreeItem,
  downloadJson,
  expandTree,
  expandedPaths,
  fileState,
  formatJson,
  importFile,
  isValid,
  issue,
  issueLocation,
  lastAction,
  loadSample,
  repairActions,
  repairJson,
  setViewMode,
  sortKeys,
  source,
  stats,
  statusLabel,
  toggleTreePath,
  treeValue,
  updateTreeKey,
  updateTreeValue,
  viewMode,
} = useJsonEditor()

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    void importFile(file)
  }

  input.value = ''
}
</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">JSON 編輯器</h1>
      <p class="text-sm text-muted-foreground">格式化、修復與樹狀編輯全都在瀏覽器內完成。</p>
    </header>

    <Card>
      <CardContent class="flex flex-wrap items-center gap-2 px-4 sm:px-5">
        <ButtonGroup aria-label="檢視模式">
          <Button :variant="viewMode === 'text' ? 'default' : 'outline'" @click="setViewMode('text')">
            <FileTextIcon data-icon="inline-start" />
            文字
          </Button>
          <Button :variant="viewMode === 'tree' ? 'default' : 'outline'" @click="setViewMode('tree')">
            <BracesIcon data-icon="inline-start" />
            樹狀
          </Button>
        </ButtonGroup>

        <span class="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

        <Button variant="outline" title="載入範例" @click="loadSample">
          <SparklesIcon data-icon="inline-start" />
          範例
        </Button>
        <Button variant="outline" title="開啟 JSON 檔案" @click="openFilePicker">
          <UploadIcon data-icon="inline-start" />
          開啟
        </Button>
        <Button variant="outline" title="下載 JSON" :disabled="!source" @click="downloadJson">
          <DownloadIcon data-icon="inline-start" />
          下載
        </Button>
        <Button variant="destructive" title="清空" :disabled="!source" @click="clearJson">
          <Trash2Icon data-icon="inline-start" />
          清空
        </Button>

        <input ref="fileInput" class="sr-only" type="file" accept=".json,application/json,text/json" @change="handleFileChange" />

        <span class="hidden h-6 w-px bg-border lg:block" aria-hidden="true" />

        <Button variant="outline" title="格式化" :disabled="!source" @click="formatJson">
          <WandSparklesIcon data-icon="inline-start" />
          格式化
        </Button>
        <Button variant="outline" title="壓縮" :disabled="!source" @click="compactJson">
          <Minimize2Icon data-icon="inline-start" />
          壓縮
        </Button>
        <Button variant="outline" title="排序 key" :disabled="!source" @click="sortKeys">
          <ArrowDownAZIcon data-icon="inline-start" />
          排序
        </Button>
        <Button :disabled="!source" @click="copyJson">
          <CheckIcon v-if="copyState === 'copied'" data-icon="inline-start" />
          <ClipboardIcon v-else data-icon="inline-start" />
          {{ copyState === 'copied' ? '已複製' : '複製' }}
        </Button>

        <ButtonGroup v-if="viewMode === 'tree'" class="ml-auto" aria-label="樹狀操作">
          <Button variant="outline" :disabled="!isValid" @click="expandTree">
            <UnfoldVerticalIcon data-icon="inline-start" />
            展開
          </Button>
          <Button variant="outline" :disabled="!isValid" @click="collapseTree">
            <FoldVerticalIcon data-icon="inline-start" />
            收合
          </Button>
        </ButtonGroup>
      </CardContent>
    </Card>

    <div class="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <Card class="min-w-0 overflow-hidden">
        <CardHeader class="flex-row items-start justify-between gap-3 border-b px-4 pb-4 sm:px-5">
          <div class="space-y-1.5">
            <CardTitle>{{ viewMode === 'text' ? 'JSON 內容' : '樹狀內容' }}</CardTitle>
            <CardDescription>{{ viewMode === 'text' ? '直接編輯原始 JSON。' : '點選 key 或 value 即可修改。' }}</CardDescription>
          </div>
          <Badge :variant="isValid ? 'default' : 'destructive'">{{ statusLabel }}</Badge>
        </CardHeader>

        <CardContent v-if="viewMode === 'text'" class="px-4 sm:px-5">
          <Textarea
            v-model="source"
            class="min-h-[38rem] resize-y field-sizing-fixed font-mono leading-relaxed"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-label="JSON 內容"
          />
        </CardContent>

        <CardContent v-else class="p-0">
          <ScrollArea class="h-[42rem] w-full">
            <div class="min-w-[46rem]">
              <div class="grid grid-cols-[minmax(13rem,0.9fr)_6rem_minmax(16rem,1.2fr)_5rem] border-b bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span class="px-3 py-2.5">key</span>
                <span class="px-2 py-2.5">type</span>
                <span class="px-2 py-2.5">value</span>
                <span class="px-2 py-2.5 text-right">操作</span>
              </div>

              <JsonTreeNode
                v-if="isValid"
                :value="treeValue"
                path="$"
                :expanded-paths="expandedPaths"
                :add-item="addTreeItem"
                :delete-item="deleteTreeItem"
                :toggle-path="toggleTreePath"
                :update-key="updateTreeKey"
                :update-value="updateTreeValue"
              />

              <div v-else class="grid min-h-96 place-items-center p-8 text-center">
                <div class="space-y-2">
                  <p class="font-medium text-destructive">JSON 格式錯誤</p>
                  <p class="text-sm text-muted-foreground">{{ issueLocation || issue?.message || '請先修正內容。' }}</p>
                </div>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <aside class="grid content-start gap-5" aria-label="JSON 狀態">
        <Card>
          <CardHeader class="border-b px-4 pb-4">
            <CardTitle>文件摘要</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4 px-4">
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">行數</dt><dd class="mt-1 font-mono text-base font-semibold">{{ stats.lines }}</dd></div>
              <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">字元</dt><dd class="mt-1 font-mono text-base font-semibold">{{ stats.characters }}</dd></div>
            </dl>

            <Alert v-if="issue" variant="destructive">
              <BracesIcon />
              <AlertTitle>{{ issueLocation || '解析失敗' }}</AlertTitle>
              <AlertDescription>{{ issue.message }}</AlertDescription>
            </Alert>

            <div v-if="canRepair" class="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div>
                <p class="text-sm font-medium">偵測到可修復項目</p>
                <ul class="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <li v-for="action in repairActions" :key="action.kind" class="flex justify-between gap-3">
                    <span>{{ action.label }}</span>
                    <span>{{ action.count }} 處</span>
                  </li>
                </ul>
              </div>
              <Button @click="repairJson">
                <WandSparklesIcon data-icon="inline-start" />
                自動修復
              </Button>
            </div>

            <p v-if="copyState === 'failed'" class="text-sm text-destructive">無法存取剪貼簿，請手動選取內容複製。</p>
            <p v-if="fileState === 'failed'" class="text-sm text-destructive">無法讀取檔案。</p>
            <p v-if="lastAction" class="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{{ lastAction }}</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  </section>
</template>
