# HestiaKit 開發規格

本文件是 HestiaKit 後續開發的依據。新增功能、調整架構或整理檔案時，應優先符合這裡定義的分層與檔案結構。

## 專案定位

HestiaKit 是隱私優先的純前端瀏覽器工具箱。所有工具必須在使用者瀏覽器內完成處理，不應把使用者輸入或產生結果送出裝置。

專案採用：

- Vite
- Vue 3
- TypeScript
- Vue Router hash mode
- Vitest
- GitHub Pages 靜態部署

## 核心原則

- 使用者資料預設不離開瀏覽器。
- 工具邏輯應盡量寫成純函式，放在 `src/utils/`，方便測試。
- 頁面只負責組合畫面、串接 composable 與處理頁面專屬 DOM 行為。
- 共用互動狀態應放在 `src/composables/`。
- 共用 UI 控制元件應放在 `src/components/` 下的對應分類。
- 新增工具時，路由與側欄不得各自手寫一份資料，必須透過 `src/tools/index.ts` 註冊，並指定工具分類。
- `dist/` 僅由 CI 建置產出，本機產物不得進入 Git。

## 檔案結構規格

目前主要結構如下：

```text
src/
  App.vue
  main.ts
  router/
    index.ts
  tools/
    index.ts
  layouts/
    AppLayout.vue
  views/
    JsonEditorView.vue
    PasswordGeneratorView.vue
  components/
    forms/
      RangeControl.vue
      SegmentedControl.vue
      SwitchControl.vue
    json-editor/
      JsonTreeNode.vue
    navigation/
      SidebarNav.vue
    theme/
      ThemeToggle.vue
  composables/
    useJsonEditor.ts
    usePasswordGenerator.ts
    useTheme.ts
  utils/
    jsonEditor.ts
    jsonEditor.test.ts
    passwordGenerator.ts
    passwordGenerator.test.ts
  styles/
    theme.css
    global.css
```

各資料夾責任：

- `src/router/`：只負責建立 router 與套用路由模式。
- `src/tools/`：工具 metadata 的唯一來源，包含工具分類、工具名稱、路徑、導覽標籤、圖示與頁面 component。
- `src/layouts/`：應用程式骨架，例如側欄與主內容區。
- `src/views/`：頁面級元件，一個工具原則上對應一個 view。
- `src/components/forms/`：可跨工具重用的表單控制元件。
- `src/components/navigation/`：導覽元件。
- `src/components/theme/`：主題相關 UI 元件。
- `src/components/<tool>/`：特定工具專用但可拆分的子元件。
- `src/composables/`：Vue reactive 狀態、瀏覽器 API 串接、跨元件互動邏輯。
- `src/utils/`：不依賴 Vue 的純邏輯、資料轉換、解析、產生器與測試。
- `src/styles/`：全域樣式與設計 token。

## 新增工具流程

新增工具時，請依序建立或更新以下檔案：

1. 在 `src/utils/` 新增工具核心邏輯。
2. 在 `src/utils/` 新增對應測試，檔名使用 `<tool>.test.ts`。
3. 若工具有較多互動狀態，在 `src/composables/` 新增 `use<ToolName>.ts`。
4. 在 `src/views/` 新增 `<ToolName>View.vue`。
5. 若頁面需要拆分專用子元件，放在 `src/components/<tool>/`。
6. 在 `src/tools/index.ts` 註冊工具。

工具註冊範例：

```ts
{
  name: 'password-generator',
  path: '',
  label: '密碼產生器',
  icon: '＊',
  categoryId: 'security',
  component: PasswordGeneratorView,
}
```

`name` 應穩定且唯一，供 router named route 與側欄使用。`path` 不應以 `/` 開頭，首頁工具使用空字串。`categoryId` 必須對應 `toolCategories` 中已定義的分類。

目前工具分類：

- `security`：密碼產生器、金鑰或安全輔助工具。
- `encoding`：Base64、MD5、URL、Hex、SHA 等編碼、解碼、雜湊工具。
- `format`：JSON、XML 等格式化、驗證、檢視工具。

## View 與 Composable 分工

View 應保留：

- 頁面 template
- 頁面專屬樣式
- DOM 尺寸、焦點、捲動等畫面行為
- 組合元件與 composable

Composable 應承擔：

- reactive 狀態
- computed 衍生資料
- watch 產生的狀態同步
- 使用者操作函式
- 瀏覽器 API 串接，例如 clipboard、localStorage、matchMedia

Utils 應承擔：

- 純資料處理
- 產生器
- parser / formatter / serializer
- 不依賴 Vue 的可測邏輯

## UI 與樣式規格

- 優先使用既有 CSS variables，不在單一元件內硬寫大量新色票。
- 共用尺寸、間距、圓角與色彩應放在 `src/styles/theme.css`。
- 基礎 reset 與全域 HTML/body 行為放在 `src/styles/global.css`。
- 表單控制優先使用 `src/components/forms/` 內既有元件。
- 工具頁面應維持工作型介面，避免 landing page 式的大篇幅介紹。
- 側欄導覽必須由 `src/tools/index.ts` 產生，不在 `SidebarNav.vue` 手寫工具清單。

## 測試規格

新增或修改 `src/utils/` 的行為時，必須補或更新 Vitest 測試。

常用命令：

```powershell
npm run test
npm run build
```

修改 UI-only 樣式時可視情況只跑 build；修改核心工具邏輯、parser、formatter、generator 時必須跑 test。

## 建置與部署

本專案使用 GitHub Pages 靜態部署：

- Router 使用 hash mode。
- Vite `base` 使用相對路徑設定。
- GitHub Actions 會執行 `npm ci`、`npm run test`、`npm run build` 並上傳 `dist/`。

`dist/` 是 CI 產物，已列入 `.gitignore`。本機 build 產生的 `dist/` 不應加入 Git。

## Docker 規格

Docker 只用於本機啟動與預覽，不作為線上部署方式。線上部署仍以 GitHub Pages 為準。

容器化規格：

- `Dockerfile` 使用 Node.js image。
- image build 時執行 `npm ci`、`npm run test` 與 `npm run build`。
- container 啟動時使用 `npm run preview` serve 已建置的 `dist/`。
- 本地啟動入口使用 `compose.yaml`，固定對外開放 `http://localhost:8080`。
- 不使用 Nginx；避免讓本機 Docker 與正式部署路徑產生額外差異。
- `.dockerignore` 必須排除 `node_modules/`、`dist/`、log 與本機 IDE 設定。

常用命令：

```powershell
docker compose up --build
docker compose down
```

## 提交前檢查

提交前至少確認：

- 新工具已在 `src/tools/index.ts` 註冊。
- 側欄與路由沒有重複手寫工具 metadata。
- 核心邏輯有對應測試。
- `npm run test` 通過。
- `npm run build` 通過。
- 若修改 Dockerfile 或 Compose 設定，`docker compose up --build` 可正常啟動。
- `dist/` 沒有被 staged。
