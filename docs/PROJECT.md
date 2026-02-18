# Todo Next - プロジェクト概要

## 運用ルール

- 実施した作業は全てこのファイルに記録し、何がどこまで終わっていて次に何が必要かを常にわかるようにすること
- タスク完了時はチェックマークを更新すること
- 新たに判明した前提条件や設定状況も記載すること

## 現在の状態

シンプルなTODOアプリが完成し、Vercelにデプロイ済み。
Supabase基盤（認証・DB・Realtime同期）が稼働中。

- **本番URL**: https://REDACTED_PRODUCTION_URL
- **GitHub**: https://github.com/kazuya-tanimoto/todo-next

### 技術スタック
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase（認証 + DB）
- ローカルストレージ（テーマ・選択リストの永続化のみ）

### 実装済み機能
- TODO追加/完了/削除（Supabase DB）
- 複数リスト管理（CRUD）
- リスト共有（招待リンク方式）
- 3つのテーマ切り替え（Mono, Natural, Neo-Brutalism）
- テーマのローカルストレージ永続化
- レスポンシブデザイン
- Google OAuthログイン/ログアウト
- 認証ミドルウェア（未ログイン → /login リダイレクト、招待リンクへの自動リダイレクト）

### Supabase設定状況
- **プロジェクト**: `REDACTED_SUPABASE_REF`（todo-next-v2）
- **リージョン**: ap-northeast-1 (東京)
- **マイグレーション**: 6ファイル（適用済み）
- **Google OAuth**: 設定済み
- **環境変数**: `.env.local` に設定（gitignore対象）
- **Realtime**: 有効（todos, lists, list_shares テーブル。本番E2E検証済み）
- **注意**: Vercel環境変数を設定する際、`echo`等で末尾改行が混入しないよう`printf`を使うこと

### ファイル構成
```
src/
├── app/
│   ├── auth/callback/
│   │   └── route.ts     # OAuthコールバック
│   ├── invite/[token]/
│   │   ├── page.tsx      # 招待受け入れページ
│   │   └── page.test.tsx # 招待テスト（4件）
│   ├── login/
│   │   ├── page.tsx      # ログインページ
│   │   └── page.test.tsx # ログインテスト（3件）
│   ├── globals.css       # テーマ定義（CSS変数）
│   ├── layout.tsx        # ルートレイアウト
│   ├── page.tsx          # メインページ（コンポジション）
│   └── page.test.tsx     # ページテスト（3件）
├── components/
│   ├── ListSelector.tsx       # リスト管理（CRUD + 共有）
│   ├── ListSelector.test.tsx  # リストテスト（8件）
│   ├── ShareDialog.tsx        # 共有管理ダイアログ
│   ├── ShareDialog.test.tsx   # 共有テスト（8件）
│   ├── ThemeSwitcher.tsx      # テーマ切り替え
│   ├── ThemeSwitcher.test.tsx # テーマテスト（2件）
│   ├── TodoSection.tsx        # TODO管理（Supabase）
│   └── TodoSection.test.tsx   # TODOテスト（7件）
├── lib/
│   └── supabase/
│       ├── client.ts     # ブラウザ用Supabaseクライアント
│       └── server.ts     # サーバー用Supabaseクライアント
├── types/
│   └── index.ts          # 共有型定義（List, Todo, InviteToken, ListShare, Theme）
├── middleware.ts          # 認証ガード + セッション更新 + redirectTo対応
└── test/
    └── setup.ts          # テストセットアップ（jest-dom）

supabase/
├── config.toml            # Supabase CLI設定
└── migrations/
    ├── 20260202141948_init_schema.sql  # テーブル + RLS
    ├── 20260208022114_fix_rls_recursion.sql  # RLS無限再帰修正
    ├── 20260213220549_add_invite_tokens_and_sharing.sql  # 招待リンク + 共有権限
    ├── 20260214050855_enable_realtime.sql  # Realtime有効化
    ├── 20260214072513_add_get_invite_info_rpc.sql  # 招待情報RPC
    └── 20260215080000_fix_realtime_rls.sql  # Realtime + RLS互換性修正

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
- 共有されたリスト/TODOのフルCRUD（`has_list_access()`関数）
- リストオーナーのみ共有設定・招待トークン管理可能
- 共有メンバーの離脱（自分のshareを削除）

### リスト共有設計

**方式**: 招待リンク方式
- メール検索方式はプライバシーリスク（全ユーザーのメールが検索可能になる）があるため不採用
- オーナーが招待リンクを生成し、LINE・メール等で共有相手に送付
- 受け取った側がリンクを開いて「参加」すると共有成立

**共有ユーザー権限**: フルCRUD（TODO追加・完了チェック・削除すべて可能）
- 家族で買い物リストを共同編集するユースケースに最適化

**共有管理機能**:
- 招待リンク生成（7日間有効、リストオーナーのみ）
- 招待リンク無効化
- 共有メンバー一覧表示（メールアドレス、`get_list_members` RPC経由）
- メンバー削除（リストオーナーのみ）
- リストからの離脱（共有メンバー自身）

**招待フロー**:
1. オーナーがShareDialogで「招待リンクを作成」→ URLがクリップボードにコピー
2. LINEなどで共有相手にURLを送信
3. 相手がURLを開く → `/invite/[token]` ページでリスト名と「参加する」ボタン表示
4. 未ログインの場合はログイン後に自動で招待ページに戻る（`redirectTo`パラメータ）
5. 「参加する」クリック → `accept_invite` RPC → 共有成立 → ホームにリダイレクト

**DB**: `invite_tokens`テーブル + `accept_invite()` / `get_list_members()` RPC関数

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
7. [x] リストCRUD
8. [x] TODO CRUDをSupabase移行
9. [x] リスト共有機能（招待リンク方式）
10. [x] コンポーネント分割（TodoItem, TodoList, ListItem抽出済み。残りは現状のサイズで適切）
11. [x] リアルタイム同期（Supabase Realtime — todos, lists, list_shares）
12. [x] 新Supabaseプロジェクトへの移行（`REDACTED_SUPABASE_REF` に移行完了、旧プロジェクト削除済み）
13. [x] ライブラリ見直し・リファクタ → PBI-014~016に分解して [PBI.md](PBI.md) に移行

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
- **E2E動作確認**: MCP Playwright + ローカルSupabase（詳細は [TESTING.md](TESTING.md) を参照）
- **注意**: Node.js 25のネイティブlocalStorageとhappy-domの競合を回避するため、vitest.config.tsで`--no-experimental-webstorage`を設定
