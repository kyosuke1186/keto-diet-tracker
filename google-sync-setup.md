# 体重管理アプリ Google同期

## 現在の構成

- アプリ: Google Apps ScriptのウェブアプリURL
- 同期スプレッドシート: https://docs.google.com/spreadsheets/d/1b5LpA47wX5r5B9sIIaUxwFD9pEi9YUZxRVP90kbQ5V8/edit
- 保存対象: 設定、体重記録

## 使うタブ

- `管理`
- `設定`
- `体重記録`

食事、糖質、食品テンプレのタブは使いません。

## 手動でApps Scriptへ貼る場合

1. Apps Scriptプロジェクトを開く
2. `Code.gs` の中身を全部消す
3. このリポジトリの `Code-hosted.gs` を全部貼る
4. 保存する
5. 既存のウェブアプリデプロイを更新する

通常利用では、アプリ画面で同期URLやキーを入力する必要はありません。
