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

### E2Eテスト自動化（Playwright導入時）

将来的にPlaywrightでテストスイートを構築する場合の方針:

Google OAuthの画面はPlaywrightで操作できない。以下の方法で認証する：

1. **テスト用ユーザー**をSupabaseにemail+passwordで作成（Supabaseダッシュボード → Authentication → Users）
2. **Playwrightのglobal setup**でSupabase APIに直接ログインし、セッションcookieを`storageState`に保存
3. 各テストは保存済みのcookieを使って認証済み状態で実行

```ts
// playwright/global-setup.ts のイメージ
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const { data } = await supabase.auth.signInWithPassword({
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
});
// → セッションcookieをstorageStateファイルに保存して全テストで再利用
```

**重要**: テスト用のemail認証はSupabaseの既存設定で有効。アプリのログインUIにemail認証を追加する必要はない。
