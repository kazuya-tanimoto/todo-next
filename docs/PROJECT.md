# Todo Next - プロジェクト概要

## 現在の状態

シンプルなTODOアプリが完成し、Vercelにデプロイ済み。

- **本番URL**: https://REDACTED_PRODUCTION_URL
- **GitHub**: https://github.com/kazuya-tanimoto/todo-next

### 技術スタック
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- ローカルストレージ（現在のデータ保存方式）

### 実装済み機能
- TODO追加/完了/削除
- 3つのテーマ切り替え（Mono, Natural, Neo-Brutalism）
- テーマ・TODOのローカルストレージ永続化
- レスポンシブデザイン

### ファイル構成
```
src/
├── app/
│   ├── globals.css    # テーマ定義（CSS変数）
│   ├── layout.tsx     # ルートレイアウト
│   └── page.tsx       # メインTODOコンポーネント
```

---

## 今後の計画

### ゴール
買い物リストなどをPCで作成し、外出先でスマホからチェックできるようにする。
家族でリストを共有できるようにする。

### 必要な機能
1. **複数デバイス同期** - ローカルストレージ → Supabase移行
2. **認証** - Googleログイン
3. **複数リスト** - 買い物、仕事、など分類
4. **家族共有** - リストを特定ユーザーと共有

---

## 次のステップ: Supabase導入

### 1. Supabaseプロジェクト設定（ユーザー側作業）

1. Supabaseダッシュボードで新規プロジェクト作成
2. **Settings → API** から取得:
   - `Project URL` (例: https://xxxxx.supabase.co)
   - `anon public` key
3. **Authentication → Providers → Google** で:
   - Enable Google provider を ON
   - Google Cloud ConsoleでOAuth 2.0クライアントID作成
   - Client ID / Client Secret を入力
   - Redirect URL: `https://xxxxx.supabase.co/auth/v1/callback`

### 2. 環境変数設定
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
```

### 3. テーブル設計（予定）
```sql
-- リスト
create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- TODO
create table todos (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  text text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- リスト共有（将来）
create table list_shares (
  list_id uuid references lists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (list_id, user_id)
);
```

### 4. Row Level Security（予定）
- 自分が作成したリストのみ表示
- 共有されたリストも表示
- TODO は所属リストの権限に従う

### 5. 実装タスク
1. `@supabase/supabase-js` インストール
2. Supabaseクライアント初期化
3. 認証UI（ログイン/ログアウト）
4. リストCRUD
5. TODO CRUDをSupabase移行
6. リアルタイム同期（オプション）

---

## デザインメモ

ユーザーの好み: **Natural** または **Neo-Brutalism**

AIが紫グラデーションを多用する傾向があるため、意識的に避けた。
現在のテーマは以下の3種類:

| テーマ | 特徴 |
|--------|------|
| Mono | 白黒 + 赤アクセント、ミニマル |
| Natural | ベージュ系、アースカラー、温かみ |
| Brutal | 太枠、ハードシャドウ、ポップ |

---

## コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# Vercelデプロイ
npx vercel --prod
```
