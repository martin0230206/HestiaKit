# HestiaKit

HestiaKit 是隱私優先的純前端瀏覽器工具箱。所有工具都在使用者的瀏覽器中執行，不會把輸入內容或產生結果送出裝置。

## 開發指令

```powershell
npm install
npm run dev
npm run test
npm run build
```

## Docker

Docker 僅供本機預覽，線上部署仍使用 GitHub Pages。

啟動：

```powershell
docker compose up --build
```

啟動後開啟 <http://localhost:8080>。

停止：

```powershell
docker compose down
```

## 目前工具

- 密碼產生器：支援隨機密碼與 PIN。
- Base64：支援 UTF-8 文字編碼、解碼、URL-safe 格式與本機轉換紀錄。
- MD5：支援 UTF-8 文字雜湊、小寫/大寫輸出與本機雜湊紀錄。
- JSON 編輯器：支援文字與樹狀檢視、展開/收合、格式化、壓縮、排序 key、即時驗證、本機匯入與下載。
- JSON 轉表格：支援保守、攤平與多表格模式，將 JSON 陣列、物件與基本型別轉換成 Markdown 表格。
- 剪貼簿轉 Markdown：支援 HTML 與純文字貼上後轉換成 Markdown。

## 開發文件

後續開發請遵循 [HestiaKit 開發規格](docs/DEVELOPMENT.md)，包含架構分層、檔案結構、新增工具流程、測試與部署規則。

## 技術

- Vite
- Vue 3
- TypeScript
- Vue Router hash mode，適合 GitHub Pages 靜態部署
