# MOSAIC VIDEO Generator

徐々にモザイクをかける動画（WebM/MP4）を生成するWebアプリです。

## GitHub Pages へのデプロイ手順

### 1. リポジトリを作成

1. [GitHub](https://github.com) にログイン
1. 右上「+」→「New repository」
1. Repository name: `mosaic-video`（任意）
1. **Public** を選択 → 「Create repository」

### 2. ファイルをアップロード

以下の **3ファイル** をアップロード：

- `index.html`
- `style.css`
- `app.js`

「uploading an existing file」→ドラッグ&ドロップ →「Commit changes」

### 3. GitHub Pages を有効化

Settings → Pages → Branch: `main` / `(root)` → Save

### 4. アクセス

`https://ユーザー名.github.io/mosaic-video/`

-----

## 使い方

1. 画像をドロップ or クリックして選択
1. パラメータを設定
1. 「▶ 動画を生成」→ リアルタイムで録画
1. 完成後「⬇ 動画をダウンロード」

## パラメータ

|設定      |説明                      |
|--------|------------------------|
|モザイク最大強度|大きいほど強いモザイク（4〜400px）    |
|動画の長さ   |1〜60秒                   |
|フレームレート |10〜60fps                |
|出力サイズ   |長辺のピクセル数（240〜1280px）    |
|方向      |クリア→モザイク / モザイク→クリア / 往復|
|イージング   |変化速度のカーブ                |

## 出力形式

- MP4（Chrome/Edge、対応環境）
- WebM（その他）
- WebM→MP4変換は [CloudConvert](https://cloudconvert.com/webm-to-mp4) が便利です
