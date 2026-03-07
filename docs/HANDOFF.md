# 引き継ぎ: Todo追加400エラー修正 + 開発環境の問題

## 目的

本番環境でTodo追加時に400 Bad Requestが発生する問題を修正する。

## 本番エラーの原因

- `todos`テーブルに`position`カラム（NOT NULL、デフォルト値なし）が本番DBに直接追加されている
- コードベースのマイグレーションには存在しない
- insert時に`position`を渡していないためNOT NULL制約違反

## 作成済みの修正

マイグレーションファイルは作成済み（未適用）:

- **ファイル**: `supabase/migrations/20260308000000_remove_todos_position_column.sql`
- **内容**: `alter table public.todos drop column if exists position;`

### 残タスク

1. `supabase db push` で本番DBに適用
2. 本番サイトでTodo追加が動作することを確認
3. テストがパスすることを確認
4. コミット＆プッシュ

---

## 開発環境で発生している問題

### 問題1: Claude Codeのサンドボックス内で`yarn install`が失敗する

```
Error: While persisting .../resolve/ -> .../node_modules/eslint-plugin-react/node_modules/resolve
EPERM: operation not permitted, open '.../resolve/.gitmodules'
```

- **ユーザーのターミナルからは正常に`yarn install`が完了する**
- Claude Codeのサンドボックス環境でのみ発生
- `.gitmodules`ファイルの書き込みがブロックされている
- サンドボックスの`allowUnsandboxedCommands`を有効にしても同じエラー（原因不明）
- `/sandbox`コマンドでStrict modeに戻し済み

### 問題2: `yarn test --run`が`ERR_REQUIRE_ESM`で失敗する

```
Error [ERR_REQUIRE_ESM]: require() of ES Module .../vite/dist/node/index.js
from .../vitest/dist/config.cjs not supported.
```

- Claude Code内から実行した際に発生
- 現在のNode.jsバージョンは**v24.2.0**
- ただし、**このPCで先日まで動いていた**ため、Node.jsバージョンが本当の原因かは不明
- 問題1（yarn installの失敗）により`node_modules`が不完全な状態で実行された可能性あり
- **ユーザーのターミナルで`yarn install`成功後に`yarn test`を試せば解決する可能性がある**

### 問題3: `supabase db push`がTLSエラーで失敗する

```
failed to verify certificate: x509: OSStatus -26276
```

- サンドボックスのネットワーク制限で`api.supabase.com`が許可されていないことが原因の可能性
- ユーザーのターミナルから直接実行すれば解決する可能性が高い

---

## yarn→npm revert の検討

yarn移行コミット: `5d21163 chore: switch package manager from npm to yarn (v4.12.0)`
その前のコミット: `4219d7c test: add missing vitest globals in TagFilter.test.tsx`

### revert確認手順

```bash
# 1. yarn移行前のコミットでテストが動くか確認
git stash  # 未コミットのマイグレーションファイルを退避
git checkout 4219d7c -- package.json package-lock.json
# package-lock.jsonは削除済みなのでcheckoutでは復元できない
# → git revert 5d21163 の方が安全

# 2. revertする場合
git revert 5d21163
npm install
npm test
```

### 判断基準

- ユーザーのターミナルで`yarn test`が正常に動くなら、revertは不要（Claude Codeのサンドボックスの問題）
- ユーザーのターミナルでも`yarn test`が失敗するなら、revertを検討

---

## 推奨する次のアクション

1. **ターミナルで`yarn test --run`を実行**して、テストが動くか確認
2. **ターミナルで`supabase db push`を実行**してマイグレーション適用
3. 本番でTodo追加を確認
4. 全て動けばコミット＆プッシュ
5. テストが動かない場合はyarn revertを検討
