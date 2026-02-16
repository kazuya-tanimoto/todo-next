# 引き継ぎ書: 新Supabaseプロジェクトへの移行

## 背景

現在のSupabaseプロジェクト(`frjwwlmootrswugywibh`, ap-northeast-1)のRealtimeサービスに
インフラ障害が発生。Management API Health Checkで以下が確認された:

```
db_connected: false
replication_connected: false
```

Realtimeサービス（ap-southeast-1）がPostgreSQLデータベース（ap-northeast-1）に接続できない状態。
以下を試行したが全て効果なし:

- プロジェクト pause/restore
- Realtime config変更（connection_pool、suspend/unsuspend）
- DBパスワードリセット

REST API・認証・ストレージ等の他サービスは全て正常。Realtimeのみの問題。
本番稼働前のため、新プロジェクトを作成して移行する。

## コードの状態

**ソースコードの変更は不要。** 全て環境変数経由で動作する。

## 移行手順

### 1. 新Supabaseプロジェクト作成

```bash
# CLIで作成（または https://supabase.com/dashboard で手動作成）
supabase projects create todo-next-v2 --region ap-northeast-1 --org-id luhoyhtfnmocdhkavnsz
```

- リージョン: `ap-northeast-1`（東京）
- Organization: `luhoyhtfnmocdhkavnsz`

### 2. プロジェクトリンク

```bash
supabase unlink
supabase link --project-ref <新プロジェクトのref>
```

### 3. マイグレーション適用

```bash
supabase db push
```

適用されるマイグレーション（5つ）:
1. `20260202141948_init_schema.sql` — テーブル + RLS
2. `20260208022114_fix_rls_recursion.sql` — RLS無限再帰修正
3. `20260213220549_add_invite_tokens_and_sharing.sql` — 招待リンク + 共有
4. `20260214050855_enable_realtime.sql` — Realtime有効化
5. `20260214072513_add_get_invite_info_rpc.sql` — 招待情報RPC

### 4. Google OAuth設定

Supabaseダッシュボード → Authentication → Providers → Google:

1. Google Cloud Consoleで新プロジェクトのcallback URLを追加:
   - `https://<新ref>.supabase.co/auth/v1/callback`
2. Client ID と Client Secret を入力
3. 有効化

> Google Cloud Console の OAuth 2.0 Client: https://console.cloud.google.com/apis/credentials
> 既存のOAuthクライアントに新しいリダイレクトURIを追加するだけでOK。

### 5. 環境変数の更新

#### `.env.local`（ローカル開発）

```
NEXT_PUBLIC_SUPABASE_URL=https://<新ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<新anon key>
```

#### Vercel（本番）

```bash
# Vercel CLIで更新
npx vercel env rm NEXT_PUBLIC_SUPABASE_URL production
npx vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "https://<新ref>.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "<新anon key>" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

### 6. supabase/config.toml の確認

`[auth]` セクションの以下は現在のVercel URLのまま変更不要:

```toml
site_url = "https://REDACTED_PRODUCTION_URL"
additional_redirect_urls = ["http://localhost:3000/auth/callback", "https://REDACTED_PRODUCTION_URL/auth/callback"]
```

config pushで新プロジェクトに反映:

```bash
supabase config push
```

### 7. Realtime動作確認

```bash
# WebSocket接続テスト
ANON_KEY=<新anon key>
curl -sI \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://<新ref>.supabase.co/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0"

# 期待: HTTP/1.1 101 Switching Protocols（500でないこと）

# Management API Health Check
TOKEN=$(security find-generic-password -s "Supabase CLI" -a "supabase" -w | sed 's/go-keyring-base64://' | base64 -d)
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "https://api.supabase.com/v1/projects/<新ref>/health?services=realtime"

# 期待: db_connected: true, replication_connected: true
```

### 8. デプロイ & E2E検証

```bash
npx vercel --prod
```

MCP Playwrightで動作確認（TESTING.md参照）:
- ログイン → TODO作成 → リアルタイム同期確認

### 9. 旧プロジェクトの削除

動作確認後、旧プロジェクトを削除:

```bash
supabase projects delete frjwwlmootrswugywibh
```

## 完了後の作業

- `docs/PROJECT.md` のプロジェクトIDを新refに更新
- この引き継ぎ書を削除
