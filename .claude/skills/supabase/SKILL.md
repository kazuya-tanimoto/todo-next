---
name: supabase
description: Supabase連携の設計方針と実装パターン
---
# Supabase連携ルール

## クライアント構成
- Browser用: `src/lib/supabase/client.ts` (createBrowserClient)
- Server用: `src/lib/supabase/server.ts` (createServerClient)
- パッケージ: `@supabase/supabase-js` + `@supabase/ssr`

## 認証
- Google OAuth
- セッション管理は `src/middleware.ts` で更新
- コールバック: `src/app/auth/callback/route.ts`

## DB操作
- Server Actionsで実装 (`src/lib/actions/`)
- 型定義: `src/lib/database.types.ts`
- スキーマ: `supabase/migrations/20260202141948_init_schema.sql`

## テスト方針
- UIコンポーネントはprops経由でテスト（Supabaseモック不要）
- 認証ボタン等の外部連携のみモック許可
