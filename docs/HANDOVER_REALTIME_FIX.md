# 引き継ぎ書: 本番 Realtime 同期の修正

## 経緯

### 問題の発端

Supabase Realtime（リアルタイム同期）が本番環境で動作しない問題が続いている。

最初のプロジェクト(`frjwwlmootrswugywibh`, ap-northeast-1)で Realtime を実装したところ、
本番環境で動作しなかった。Management API Health Check で以下が確認された:

```
db_connected: false
replication_connected: false
```

Realtimeサービス（ap-southeast-1）が DB（ap-northeast-1）に接続できない状態。

### 旧プロジェクトで試したこと（全て効果なし）

- プロジェクト pause/restore
- Realtime config変更（connection_pool、suspend/unsuspend）
- DBパスワードリセット
- RLSポリシーから SECURITY DEFINER を除去するマイグレーション追加（`20260215080000_fix_realtime_rls.sql`）

REST API・認証・ストレージは全て正常で、Realtimeのみの問題だった。

### 新プロジェクトへの移行

インフラ障害と判断し、新プロジェクト(`REDACTED_SUPABASE_REF`, todo-next-v2)を作成して全移行した。
**しかし、新プロジェクトでも本番環境で同じくRealtimeが動作しない。**

旧プロジェクトは移行時に削除済み（復元不可）。

### 現在の症状

本番（Vercel: https://REDACTED_PRODUCTION_URL）のブラウザコンソールに以下のエラーが繰り返し出る:

```
WebSocket connection to 'wss://REDACTED_SUPABASE_REF.supabase.co/realtime/v1/websocket
  ?apikey=eyJhbGci...&vsn=2.0.0' failed:
HTTP Authentication failed; no valid credentials available
```

**旧プロジェクトでも新プロジェクトでも同じ「Realtimeだけ動かない」という症状。**
プロジェクトを作り直しても問題は解決していない。
インフラ障害ではなく、設定・コード・環境に根本原因がある可能性が高い。

### ローカル vs 本番の違い

| 環境 | REST API | Realtime |
|------|----------|----------|
| ローカル devサーバー + リモートSupabase | OK | **OK**（2タブ間同期確認済み、約1秒遅延） |
| 本番 Vercel + リモートSupabase | OK | **NG**（WebSocket認証エラー） |

ローカルでは動くが本番では動かない。これが重要な手がかり。

## 既知の問題: Vercel Git連携が未接続

VercelプロジェクトとGitHubリポジトリのGit連携が接続されていない。
`git push` しても Vercel の自動デプロイはトリガーされない。

```bash
# 接続を試みるとエラーになる
npx vercel git connect
# Error: Failed to connect kazuya-tanimoto/todo-next to project.
```

そのため、デプロイは常に **`npx vercel --prod` でCLI経由**で行う必要がある。
この問題は以前のセッションから継続している既知の問題。

## 調査すべきポイント

### 0. Vercel Git連携未接続による不整合の可能性

Git連携が切れていることを把握せずに作業していた。
`npx vercel --prod` でCLIデプロイしているが、env設定→デプロイの順序や、
ビルド時に正しいenv varsが使われたかの検証が甘い可能性がある。
本番JSバンドルに埋め込まれたSupabase URLが新プロジェクトのものか、
anon keyが正しいかをブラウザDevToolsで確認すべき。

### 1. Vercel環境変数とビルド時の埋め込み

`NEXT_PUBLIC_` 変数はビルド時にバンドルに埋め込まれる。

```bash
npx vercel env ls production
```

- env設定後にデプロイしたか（順序が正しいか）
- ブラウザDevToolsでWebSocket URLの `apikey` パラメータを確認し、正しいanon keyか見る

```bash
supabase projects api-keys --project-ref REDACTED_SUPABASE_REF
```

### 2. ローカルと本番の差異分析

ローカルでは動いて本番で動かないので、差異を洗い出す:
- Supabase URLとanon keyが本番で正しく設定されているか
- Vercelのエッジ/ミドルウェアがWebSocket接続に影響していないか
- CORSやCSP設定の違いはないか

### 3. Supabase Realtime設定

ダッシュボード（https://supabase.com/dashboard/project/REDACTED_SUPABASE_REF）で:
- Database → Replication → `supabase_realtime` publication にテーブルが含まれているか
- Realtime Inspector でWebSocket接続テスト

DB dump での確認（前回は todos, lists, list_shares 全て含まれていた）:
```bash
supabase db dump --linked -f /dev/stdout 2>/dev/null | grep -A5 'supabase_realtime'
```

### 4. RLSポリシーの確認

`20260215080000_fix_realtime_rls.sql` で SECURITY DEFINER を SELECT ポリシーから除去済み。
実際に適用されているか `supabase db dump` でポリシーを確認すべき。

### 5. 公式ドキュメントの再確認

Supabase Realtime の本番デプロイ要件を公式ドキュメントで確認すること:
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/realtime/concepts
- https://supabase.com/docs/guides/realtime/troubleshooting

## 移行で実施した作業（全て完了済み）

- 新プロジェクト作成（`REDACTED_SUPABASE_REF`, ap-northeast-1）
- `supabase link --project-ref REDACTED_SUPABASE_REF`
- マイグレーション6件適用（`supabase db push`）
- `supabase config push`（認証設定: site_url, redirect_urls）
- Google OAuth設定（Supabaseダッシュボード + Google Cloud Console）
- `.env.local` 更新（新プロジェクトのURL・キー）
- Vercel環境変数更新（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- `npx vercel --prod` デプロイ
- `docs/PROJECT.md` 更新、旧 `HANDOVER_NEW_PROJECT.md` 削除
- git: 2コミットがmainでunpushed（`4a62595`, `47287c7`）

## テストユーザー（要クリーンアップ）

新プロジェクトにテストユーザーが残っている:
- Email: test@example.com
- Password: testpass123
- User ID: a59e9b51-e51c-4fcc-bb74-5058824aa1b3

確認完了後に削除すること:
```bash
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Ynh3c2dxd3ZnZGx6dWx1amN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5NDE4MCwiZXhwIjoyMDg2NzcwMTgwfQ.ujKLioL8H8Dx5YQvljgMx7ivdrOcK3L57avd9RoFzrc"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Ynh3c2dxd3ZnZGx6dWx1amN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTQxODAsImV4cCI6MjA4Njc3MDE4MH0.L2l9Rf7SDUd30S9QQ2SE6mSHOKrC1jCvHbMb1mlbr_k"
curl -X DELETE "https://REDACTED_SUPABASE_REF.supabase.co/auth/v1/admin/users/a59e9b51-e51c-4fcc-bb74-5058824aa1b3" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${ANON_KEY}"
```

## 絶対に守ること

- **不可逆な操作（プロジェクト削除・データ削除等）はユーザーに確認してから実行すること。絶対に勝手にやらない。**
- **本番環境（Vercel）でのE2E検証を必ず行ってから完了報告すること。ローカルでの動作確認だけでは不十分。**
- **公式ドキュメントを確認してから作業すること。憶測で「正常」「インフラ障害」と判断しない。**

## 関連ファイル

- `supabase/migrations/` — 6ファイル（全て適用済み）
- `.env.local` — 新プロジェクトのURL・キー（gitignore対象）
- `src/components/TodoSection.tsx` — Realtime subscription のコード
- `supabase/config.toml` — 認証設定
- `docs/PROJECT.md` — プロジェクト概要
