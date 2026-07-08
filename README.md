# yst-kaigo-profile

インドネシア人介護候補者（特定技能）向け性格診断Webアプリ。

- **候補者側**（`index.html`）: スマホで自己回答。性格傾向30問（Part A）＋価値観カード3枚選択（Part B）＋自由記述（Part C・任意）。回答後はスコアを一切表示せず、送信完了画面のみ表示。
- **スタッフ側**（`staff.html`）: Supabase Authでログインしたスタッフのみ、候補者一覧・個人詳細（6軸レーダーチャート・価値観トップ3・自由記述・信頼性フラグ・全30問素点）・カテゴリ平均比較表・CSVエクスポートを閲覧可能。

このアプリは相性診断・マッチングスコア・合否自動判定は行いません（詳細は仕様書参照）。

## セットアップ

### 1. Supabaseプロジェクトを作成

[supabase.com](https://supabase.com) で新規プロジェクトを作成（既存プロジェクトを流用してもよい）。

### 2. テーブル・RLSポリシーを作成

Supabaseダッシュボード → SQL Editor で [`supabase/schema.sql`](supabase/schema.sql) の内容を実行する。

これにより以下が作成されます。

- `candidates` テーブル（氏名・生年月日・出身州）
- `responses` テーブル（回答・価値観トップ3・自由記述・回答時間・信頼性フラグ）
- RLS: 未認証ユーザーは `insert` のみ可能（候補者が回答を送信するため）。認証済みユーザー（スタッフ）のみ `select` / `delete` 可能。

### 3. スタッフアカウントを発行

Supabaseダッシュボード → Authentication → Users から、スタッフ用のメールアドレス・パスワードでユーザーを作成する（招待メール送信も可）。

### 4. フロントエンドにSupabaseの接続情報を設定

Supabaseダッシュボード → Project Settings → API から `Project URL` と `anon public key` を取得し、[`js/supabase-config.js`](js/supabase-config.js) を編集する。

```js
window.SUPABASE_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'xxxxxxxx'
};
```

### 5. GitHub Pagesで公開

このリポジトリをGitHubにpushし、Settings → Pages で公開ブランチ・ルートディレクトリを指定する。

- 候補者用URL: `https://<account>.github.io/yst-kaigo-profile/`
- スタッフ用URL: `https://<account>.github.io/yst-kaigo-profile/staff.html`

候補者用URLは認証なしでアクセスできるため、WhatsApp等で候補者へ直接共有する。スタッフ用URLはログインが必須。

## ディレクトリ構成

```
index.html            候補者側 回答フロー
staff.html             スタッフ側 結果閲覧ダッシュボード（要ログイン）
data/questions.json    Part A 30問（6カテゴリ×5問、日本語+インドネシア語、逆転項目フラグ）
data/values.json       Part B 価値観カード8枚（日本語+インドネシア語）
js/common.js           共通ユーティリティ・カテゴリ集計・信頼性フラグ判定ロジック
js/supabase-config.js  Supabase接続情報（要編集）
supabase/schema.sql    テーブル定義・RLSポリシー
```

他職種向けに転用する場合は `data/questions.json` と `data/values.json` を差し替えるだけで、ロジック側（`js/common.js` のカテゴリ集計・フラグ判定）はそのまま流用できる。

## 信頼性フラグ（スタッフ画面のみ表示）

1. **良く見せすぎ疑い**: D4に「1=まったくあてはまらない」と回答し、かつ非逆転項目の平均が4.8以上
2. **ストレートライン回答**: 同じ選択肢が15問以上連続
3. **回答時間**: 全体の回答時間が3分未満
4. **逆転項目の矛盾**: 同カテゴリ内で正項目平均と逆転項目(反転後)の差が2.0以上

いずれも合否判定には直結させず、面接時の深掘り材料として利用する想定。
