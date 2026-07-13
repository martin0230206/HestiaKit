<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckIcon, ClipboardIcon, FileSpreadsheetIcon, SparklesIcon, Trash2Icon, UploadIcon } from '@lucide/vue'
import SwitchControl from '@/components/forms/SwitchControl.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useCsvTable } from '@/composables/useCsvTable'

const fileInput = ref<HTMLInputElement | null>(null)

const {
  clearSource,
  copyState,
  copyTable,
  fileState,
  hasHeader,
  hasTable,
  isValid,
  issue,
  loadFile,
  loadSample,
  source,
  sourceStats,
  table,
  tableStats,
} = useCsvTable()

const issueLocation = computed(() => {
  if (!issue.value?.line || !issue.value.column) {
    return ''
  }

  return `第 ${issue.value.line} 行，第 ${issue.value.column} 欄`
})

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    await loadFile(file)
  }

  input.value = ''
}
</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">CSV 表格檢視器</h1>
      <p class="text-sm text-muted-foreground">貼上或開啟 CSV，在本機解析並預覽完整表格。</p>
    </header>

    <Card>
      <CardContent class="flex flex-wrap items-center gap-2 px-4 sm:px-5">
        <Button variant="outline" @click="loadSample">
          <SparklesIcon data-icon="inline-start" />
          載入範例
        </Button>
        <Button variant="outline" :disabled="fileState === 'loading'" @click="openFilePicker">
          <UploadIcon data-icon="inline-start" />
          {{ fileState === 'loading' ? '讀取中…' : '開啟 CSV' }}
        </Button>
        <Button variant="destructive" :disabled="!source" @click="clearSource">
          <Trash2Icon data-icon="inline-start" />
          清空
        </Button>
        <input ref="fileInput" class="sr-only" type="file" accept=".csv,text/csv" aria-label="選擇 CSV 檔案" @change="handleFileChange" />
        <Badge class="ml-auto" :variant="isValid ? 'secondary' : 'destructive'">
          <FileSpreadsheetIcon />
          {{ isValid ? `${tableStats.columns} 欄 · ${tableStats.rows} 列` : '格式錯誤' }}
        </Badge>
      </CardContent>
    </Card>

    <div class="grid min-w-0 gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
      <Card class="min-w-0">
        <CardHeader class="border-b px-4 pb-4 sm:px-5">
          <CardTitle>CSV 內容</CardTitle>
          <CardDescription>支援逗號分隔、引號與多行欄位。</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 px-4 sm:px-5">
          <SwitchControl v-model="hasHeader" label="第一列作為標題" description="關閉時會自動產生欄位名稱" />
          <Textarea
            v-model="source"
            class="min-h-96 resize-y field-sizing-fixed font-mono leading-relaxed"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-label="CSV 輸入內容"
          />
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">行數</dt><dd class="mt-1 font-mono text-base font-semibold">{{ sourceStats.lines }}</dd></div>
            <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">字元</dt><dd class="mt-1 font-mono text-base font-semibold">{{ sourceStats.characters }}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card class="min-w-0">
        <CardHeader class="border-b px-4 pb-4 sm:px-5">
          <CardTitle>表格預覽</CardTitle>
          <CardDescription>水平捲動可檢視較寬的資料。</CardDescription>
          <CardAction>
            <Button size="icon" :disabled="!hasTable || !isValid" aria-label="複製表格" @click="copyTable">
              <CheckIcon v-if="copyState === 'copied'" />
              <ClipboardIcon v-else />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="grid min-w-0 gap-4 px-4 sm:px-5">
          <div class="min-h-96 overflow-hidden rounded-lg border">
            <div v-if="!source.trim()" class="grid min-h-96 place-items-center p-8 text-center text-sm text-muted-foreground">
              貼上 CSV 或選擇檔案後會在這裡顯示表格。
            </div>
            <div v-else-if="!isValid" class="grid min-h-96 place-items-center bg-destructive/5 p-8 text-center text-sm text-destructive">
              {{ issueLocation || issue?.message }}
            </div>
            <div v-else-if="!hasTable" class="grid min-h-96 place-items-center p-8 text-center text-sm text-muted-foreground">
              CSV 內容沒有可顯示的欄位。
            </div>
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead v-for="(header, columnIndex) in table.headers" :key="`${columnIndex}-${header}`" class="whitespace-nowrap">
                    {{ header }}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, rowIndex) in table.rows" :key="rowIndex">
                  <TableCell v-for="(cell, columnIndex) in row" :key="`${rowIndex}-${columnIndex}`" class="max-w-80 whitespace-pre-wrap break-words align-top">
                    {{ cell }}
                  </TableCell>
                </TableRow>
                <TableRow v-if="table.rows.length === 0">
                  <TableCell :colspan="table.headers.length" class="h-32 text-center text-muted-foreground">沒有資料列</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">欄數</dt><dd class="mt-1 font-mono text-base font-semibold">{{ tableStats.columns }}</dd></div>
            <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">資料列</dt><dd class="mt-1 font-mono text-base font-semibold">{{ tableStats.rows }}</dd></div>
          </dl>
          <p v-if="fileState === 'failed'" class="text-sm text-destructive">無法讀取這個檔案，請確認檔案格式後再試一次。</p>
          <p v-if="copyState === 'failed'" class="text-sm text-destructive">無法存取剪貼簿，請手動選取表格內容複製。</p>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
