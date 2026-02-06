# Todo Next - プロジェクト概要

## 運用ルール

- 実施した作業は全てこのファイルに記録し、何がどこまで終わっていて次に何が必要かを常にわかるようにすること
- タスク完了時はチェックマークを更新すること
- 新たに判明した前提条件や設定状況も記載すること

## 現在の状態

シンプルなTODOアプリが完成し、Vercelにデプロイ済み。
Supabase基盤（認証・DB）の導入を進行中。

- **本番URL**: https://REDACTED_PRODUCTION_URL
- **GitHub**: https://github.com/kazuya-tanimoto/todo-next

### 技術スタック
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase（認証 + DB）
- ローカルストレージ（現在のTODOデータ保存方式、Supabase移行予定）

### 実装済み機能
- TODO追加/完了/削除
- 3つのテーマ切り替え（Mono, Natural, Neo-Brutalism）
- テーマ・TODOのローカルストレージ永続化
- レスポンシブデザイン
- Google OAuthログイン/ログアウト
- 認証ミドルウェア（未ログイン → /login リダイレクト）

### Supabase設定状況
- **プロジェクト**: todo-next (ID: `frjwwlmootrswugywibh`)
- **リージョン**: ap-northeast-1 (東京)
- **CLIリンク**: 済み
- **マイグレーション**: 適用済み（lists, todos, list_shares + RLS）
- **Google OAuth**: Supabaseダッシュボードで有効化済み
- **環境変数**: `.env.local` に設定済み（gitignore対象）

### ファイル構成
```
src/
├── app/
│   ├── auth/callback/
│   │   └── route.ts     # OAuthコールバック
│   ├── login/
│   │   ├── page.tsx      # ログインページ
│   │   └── page.test.tsx # ログインテスト（3件）
│   ├── globals.css       # テーマ定義（CSS変数）
│   ├── layout.tsx        # ルートレイアウト
│   ├── page.tsx          # メインTODOコンポーネント
│   └── page.test.tsx     # TODOテスト（3件）
├── lib/
│   └── supabase/
│       ├── client.ts     # ブラウザ用Supabaseクライアント
│       └── server.ts     # サーバー用Supabaseクライアント
├── middleware.ts          # 認証ガード + セッション更新
└── test/
    └── setup.ts          # テストセットアップ（jest-dom）

supabase/
├── config.toml            # Supabase CLI設定
└── migrations/
    └── 20260202141948_init_schema.sql  # テーブル + RLS

.env.local                 # 環境変数（gitignore対象）
.env.local.example         # 環境変数テンプレート
vitest.config.ts           # テスト設定
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

## Supabase導入

### テーブル設計 + RLS

スキーマは `supabase/migrations/20260202141948_init_schema.sql` に定義済み。

| テーブル | 用途 |
|---------|------|
| `lists` | TODOリスト（user_id, name, created_at） |
| `todos` | 各TODO項目（list_id, text, completed, created_at） |
| `list_shares` | リスト共有（list_id, user_id） |

RLSポリシーも同マイグレーションに実装済み:
- 自分が作成したリスト/TODOのCRUD
- 共有されたリストの閲覧
- リストオーナーのみ共有設定可能

### 認証設計
- **方式**: Google OAuth（Supabase Auth経由）
- **アクセス制限**: なし（誰でもGoogleログイン可能、データはRLSで隔離）
- **フロー**: ログインボタン → Google認証 → /auth/callback → セッション発行 → / にリダイレクト

### 実装タスク

実装パターンの詳細は `.claude/skills/supabase/SKILL.md` を参照。

1. [x] テーブル設計 + RLS（マイグレーション作成済み）
2. [x] テストインフラ構築（Vitest + Testing Library）
3. [x] `@supabase/supabase-js` + `@supabase/ssr` インストール
4. [x] Supabaseクライアント初期化（browser/server）
5. [x] Middleware（セッション更新 + 認証ガード）
6. [x] 認証UI（Googleログイン/ログアウト）
7. [ ] リストCRUD
8. [ ] TODO CRUDをSupabase移行
9. [ ] コンポーネント分割（TodoApp, ListSelector, TodoList, ThemeSwitcher）
10. [ ] リアルタイム同期（オプション）

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

# テスト
npm test              # 実行
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジ付き

# Vercelデプロイ
npx vercel --prod

# Supabase
supabase db push      # マイグレーション適用
supabase db reset     # ローカルDBリセット
```

## テストインフラ

- **フレームワーク**: Vitest + happy-dom
- **テストライブラリ**: @testing-library/react, @testing-library/user-event, @testing-library/jest-dom
- **ルール**: [TESTING.md](TESTING.md) を参照
- **注意**: Node.js 25のネイティブlocalStorageとhappy-domの競合を回避するため、vitest.config.tsで`--no-experimental-webstorage`を設定
