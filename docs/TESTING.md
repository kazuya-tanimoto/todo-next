# テストコード作成時の厳守事項

## 絶対に守ってください！

### テストコードの品質

- テストは必ず実際の機能を検証すること
- `expect(true).toBe(true)` のような意味のないアサーションは絶対に書かない
- 各テストケースは具体的な入力と期待される出力を検証すること
- モックは必要最小限に留め、実際の動作に近い形でテストすること

### ハードコーディングの禁止

- テストを通すためだけのハードコードは絶対に禁止
- 本番コードに `if (testMode)` のような条件分岐を入れない
- テスト用の特別な値（マジックナンバー）を本番コードに埋め込まない
- 環境変数や設定ファイルを使用して、テスト環境と本番環境を適切に分離すること

### テスト実装の原則

- テストが失敗する状態から始めること（Red-Green-Refactor）
- 境界値、異常系、エラーケースも必ずテストすること
- カバレッジだけでなく、実際の品質を重視すること
- テストケース名は何をテストしているか明確に記述すること

### 実装前の確認

- 機能の仕様を正しく理解してからテストを書くこと
- 不明な点があれば、仮の実装ではなく、ユーザーに確認すること

## 実装完了までの全工程

機能実装時は以下の全工程を順に実施すること。途中で完了としない。

1. **ユニットテスト** — Vitest + Testing Libraryでコンポーネントテスト
2. **ローカルE2E** — MCP Playwright + ローカルSupabaseでブラウザ操作検証
3. **デプロイ** — `git push origin main` → Vercel自動デプロイ → デプロイ成功を確認
4. **本番E2E検証** — 本番URLでブラウザ操作し、実機で動作確認

## 認証とテストの方針

本アプリはGoogle OAuthログインが必須（未認証は `/login` にリダイレクト）。
テスト時に認証をバイパスするために本番コードを変更してはならない。

### コンポーネントテスト（Vitest）

- `next/navigation` の `useRouter` をモックする
- `@/lib/supabase/client` をモックする
- 認証状態に依存しないUIテストを書く（props経由でデータを渡す設計を推奨）

```ts
// 例: page.test.tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}));
```

### E2E動作確認（MCP Playwright）

実装完了後のE2E動作確認には **MCP Playwright** を使用する。
ローカルSupabaseを起動し、実際のDB・認証と通信して画面操作を検証する。

#### 前提

- `.env` が必要。未作成の場合は `.env.example` をコピーして値を設定すること

#### 手順

1. `supabase start` でローカルSupabaseを起動
2. Supabase Admin APIでテストユーザーを作成（email+password）
3. パスワードログインでセッションを取得し、`sb-127-auth-token` クッキーを `base64-` + base64url エンコードで生成
4. Playwright `context.addCookies` でクッキーをセット（ドメイン: `localhost`）
5. `npm run dev` で起動したアプリに対してブラウザ操作で検証
6. 検証後: `supabase stop`

#### クッキー仕様

- 名前: `sb-127-auth-token`（ローカル）/ `sb-{project-ref}-auth-token`（リモート）
- 値: `base64-` プレフィックス + セッションJSON の base64url エンコード（パディングなし）
- ドメイン: `localhost`（`127.0.0.1` ではなく `localhost` でアクセスすること）

### E2Eテスト自動化（Playwright）

PBI-017で導入済み。`e2e/` 配下にPlaywrightのE2Eスイートを構築している。
ローカルSupabase + 実DBに対して中核フロー（Todo CRUD / リスト管理）を検証する。
共有フロー（2セッション）とCI/Docker化は次段に分離。

#### 構成

- `playwright.config.ts`: `testDir=e2e`、`baseURL=http://localhost:3000`、`webServer` で `yarn dev` を起動。`setup`（認証）→ `chromium`（本体テスト、storageState再利用）の依存関係。`workers:1` で直列実行。
- `e2e/auth.setup.ts`: 認証セットアップ（後述）
- `e2e/helpers/`: `supabase-admin.ts`（service_roleクライアント）、`auth-cookie.ts`（cookie採取）、`ui.ts`（UI操作ヘルパ）
- `e2e/{todo-crud,list-management}.spec.ts`: テスト本体
- 型チェックはE2E専用の `tsconfig.e2e.json`（`yarn typecheck:e2e`）。メインの `yarn typecheck` は `e2e/` を除外（Vitestと別レイヤーのため）

#### 認証セットアップ（auth.setup.ts）

Google OAuthはPlaywrightで操作できないため、cookie注入で認証済み状態を作る。

1. ローカルSupabaseのヘルスチェック（未起動なら明確に失敗させる）
2. service_role（Admin API）でテストユーザーを ensure（無ければ `email_confirm` 済みで作成）
3. 既存データを物理削除してクリーン化（service_role。アクティブなリストのDELETEはRLSで拒否されるため必須）
4. `profiles` 行を upsert（主キーは `id`。無いと `proxy.ts` が `/profile/setup` へリダイレクトする）
5. `createServerClient` の cookie-jar で本番同一の認証cookie（`sb-127-auth-token`、`base64-`プレフィックス、必要なら `.0/.1` チャンク）を採取
6. `context.addCookies`（url=`http://localhost:3000`）→ `e2e/.auth/user.json` に storageState 保存

手組みではなく `createServerClient` に cookie を生成させるのが要点。base64・チャンク分割の仕様差にハードコードで依存しない。

#### 必要な環境変数（`.env.local`、テンプレートは `.env.example`）

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（既存）
- `SUPABASE_SERVICE_ROLE_KEY`（`supabase status` の service_role キー。ローカル専用、コミット禁止）
- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`

#### 実行手順

1. `supabase start`
2. 初回のみ `yarn playwright install chromium`
3. `yarn test:e2e`（レポートは `yarn test:e2e:report`）
4. 検証後: `supabase stop`

#### 注意点

- アプリは必ず `localhost`（`127.0.0.1` ではない）でアクセス。cookie domain が `localhost` のため、混在すると認証cookieがリクエストに乗らず未認証扱いになる
- 単一テストユーザーを共有するため直列実行。各テストは一意名リストを作って自己完結させる
- Todo削除・一括削除に確認ダイアログは無いが、リスト削除は `window.confirm` が出る → 削除系テストは操作前に `page.on('dialog', d => d.accept())` を登録する
