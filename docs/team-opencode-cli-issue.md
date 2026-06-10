# 團隊交接：opencode CLI 問題

## 背景

2026-06-10 新增美地居家收納兩筆 PDF 案例時，使用者要求先調用 opencode CLI 協助作業。CLI 可被找到，但執行任務時卡在本機資料庫檢查點錯誤，因此本次案例匯入改由 Codex 依既有 PDF 匯入 SOP 完成。

## 當時環境

- opencode 路徑：`/Users/jacob/.local/bin/opencode`
- 目標 repo：`/Users/jacob/Documents/meidi-home-site`
- 主要任務：檢查桌面 `Michel le衣帽間收納案_20260609_224147_0000.pdf` 與 `loui衣帽間收納案_20260609_224027_0000.pdf`，協助轉為網站案例。

## 已嘗試指令與結果

- `opencode --help`：可正常顯示說明。
- `opencode run ...`：失敗。
- `opencode run --pure ...`：同樣失敗。
- `opencode db --help`：可正常顯示說明。
- `opencode db "PRAGMA wal_checkpoint(TRUNCATE);"`：即使提升權限仍失敗。

## 主要錯誤

```text
Failed to run the query 'PRAGMA wal_checkpoint(PASSIVE)'
```

後續嘗試手動 checkpoint 時出現：

```text
attempt to write a readonly database
```

## 觀察到的資料庫位置

```text
/Users/jacob/.local/share/opencode/opencode.db
/Users/jacob/.local/share/opencode/opencode.db-shm
/Users/jacob/.local/share/opencode/opencode.db-wal
```

`opencode.db-wal` 當時為 0 bytes。

## 建議排查方向

1. 檢查 `~/.local/share/opencode/` 與三個 SQLite 檔案的擁有者、群組與權限。
2. 確認是否曾用不同使用者、sudo 或其他 agent 執行 opencode，造成資料庫權限不一致。
3. 確認是否有殘留 opencode 程序鎖住資料庫。
4. 如需修復，先備份 `opencode.db`、`opencode.db-shm`、`opencode.db-wal`，再調整權限或重建本機 opencode 狀態。
5. 修復後用一個不寫入專案的小任務測試，例如 `opencode run --pure "請回覆 ok"`。

## 本次任務處理狀態

opencode 未能執行，但美地案例匯入已完成：

- `Michel 衣帽間收納案例`
- `Loui 衣帽間收納案例`
- 兩者都已轉成壓縮 WebP、加上浮水印、接入 `/portfolio/`
- server build 與 static build 都已通過
