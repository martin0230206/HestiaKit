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

建立本機預覽用 image：

```powershell
docker build -t hestiakit .
```

啟動容器：

```powershell
docker run --rm -p 8080:4173 hestiakit
```

啟動後開啟 <http://localhost:8080>。

## 目前工具

- 密碼產生器：支援隨機密碼、好記密碼與 PIN。
- JSON 檢視器：支援格式化、壓縮、鍵名排序與樹狀檢視。

## 開發文件

後續開發請遵循 [HestiaKit 開發規格](docs/DEVELOPMENT.md)，包含架構分層、檔案結構、新增工具流程、測試與部署規則。

## 技術

- Vite
- Vue 3
- TypeScript
- Vue Router hash mode，適合 GitHub Pages 靜態部署
