# ケト管理アプリ Google同期セットアップ

## 使うもの

- アプリ: https://kyosuke1186.github.io/keto-diet-tracker/
- 同期スプレッドシート: https://docs.google.com/spreadsheets/d/1b5LpA47wX5r5B9sIIaUxwFD9pEi9YUZxRVP90kbQ5V8/edit
- 同期キー: 自分で決めた長い文字列

## Apps Script設定

1. https://script.google.com/ を開く
2. 新しいプロジェクトを作る
3. `Code.gs` の中身を全部消す
4. このリポジトリの `Code.gs` の中身を全部貼る
5. `PASTE_YOUR_SYNC_KEY_HERE` を自分で決めた同期キーに置き換える
6. 右上の「デプロイ」→「新しいデプロイ」
7. 種類は「ウェブアプリ」
8. 実行ユーザーは「自分」
9. アクセスできるユーザーは「全員」
10. デプロイして、表示されたウェブアプリURLをコピー

## アプリ側設定

1. iPhoneまたはPCでアプリを開く
2. 左側の「同期」にウェブアプリURLを貼る
3. 同期キーにApps Scriptへ設定したものと同じ文字列を入れる
4. 「URL保存」
5. 既存データがある端末では「同期」を押す
6. 別端末では同じURLと同期キーを入れて「読み込み」を押す

以後、食事・体重・設定・テンプレは保存時にGoogleへ送信されます。
