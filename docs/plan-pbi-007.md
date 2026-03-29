# PBI-007: Todo詳細表示（開閉式アコーディオン）

## Context

Todoタイトルだけでは伝えきれない補足情報（手順、メモ、リンク等）を記録したい。Todoをクリック/タップで開閉し、`description`を表示・編集できるようにする。

## 設計判断

- **expand/collapse状態**: TodoItemのローカルstate（親での管理不要）
- **DnDとの干渉**: なし。PointerSensor(distance:8px)のため単純クリックはドラッグにならない。ドラッグハンドルは独立した`<button>`
- **description入力**: 作成フォームには追加しない。作成後にアコーディオン内で編集（現在のシンプルなUXを維持）
- **保存方式**: blur時に自動保存（descriptionDraftが変わっていない場合はスキップ）
- **入力UI**: `<textarea>` + `theme-input`クラス（contentEditableは避ける）
- **Realtime**: 既存のUPDATEハンドラが`{ ...t, ...updated }`でspreadするため、追加変更不要

## 実装ステップ

### 1. DBマイグレーション
**新規**: `supabase/migrations/20260319000000_add_todos_description.sql`
```sql
alter table public.todos add column description text;
```
- nullable、デフォルトなし（既存行はnull）
- REPLICA IDENTITY FULLは設定済み → Realtimeペイロードに自動で含まれる

### 2. 型定義の更新
**変更**: `src/types/index.ts`
- `Todo`に `description: string | null;` を追加（`position`の次）

### 3. TodoItem UIの変更
**変更**: `src/components/TodoItem.tsx`

構造変更:
- 外側divから`p-4`を内側のflex行に移動（アコーディオン領域の分離）
- テキスト+タグ領域をクリッカブルに（`onClick`でexpand/collapse切り替え）
- 展開時のシェブロンアイコン（`rotate-180`でアニメーション）
- 展開時に`<textarea>`を表示（blur時に`onUpdateDescription`呼び出し）

新しいProps:
```typescript
onUpdateDescription: (id: string, description: string) => void;
```

ローカルstate:
```typescript
const [isExpanded, setIsExpanded] = useState(false);
const [descriptionDraft, setDescriptionDraft] = useState(todo.description ?? "");
```

Realtime同期用effect:
```typescript
useEffect(() => { setDescriptionDraft(todo.description ?? ""); }, [todo.description]);
```

descriptionが存在する場合の視覚的インジケータ（折りたたみ時にもわかるように小さいアイコン表示）。

### 4. TodoList propsの中継
**変更**: `src/components/TodoList.tsx`
- Props interfaceに`onUpdateDescription`を追加
- 各`<TodoItem>`に渡す

### 5. TodoSection CRUD追加
**変更**: `src/components/TodoSection.tsx`

新関数 `updateDescription`:
```typescript
const updateDescription = async (id: string, description: string) => {
  const supabase = createClient();
  const newDescription = description.trim() || null;
  const { error } = await supabase
    .from("todos")
    .update({ description: newDescription })
    .eq("id", id);
  if (!error) {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, description: newDescription } : todo
      )
    );
  }
};
```
- `<TodoList>`に`onUpdateDescription={updateDescription}`を渡す

### 6. テスト

**更新**: `src/components/TodoSection.test.tsx`
- mockTodosに`description: null`を追加

**新規**: `src/components/TodoItem.test.tsx`
- アコーディオン開閉（クリックでtextarea表示/非表示）
- description編集→blur→`onUpdateDescription`呼び出し
- 未変更時のblurではコールバック呼び出しなし
- description存在時のインジケータ表示
- `@dnd-kit/sortable`をモック

## 変更ファイル一覧
| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/20260319000000_add_todos_description.sql` | 新規: descriptionカラム追加 |
| `src/types/index.ts` | Todo型にdescription追加 |
| `src/components/TodoItem.tsx` | アコーディオンUI実装 |
| `src/components/TodoList.tsx` | props中継 |
| `src/components/TodoSection.tsx` | updateDescription関数追加 |
| `src/components/TodoSection.test.tsx` | mockデータ更新 |
| `src/components/TodoItem.test.tsx` | 新規: アコーディオンテスト |

## 検証

1. `yarn test` — 全テスト通過
2. `yarn build` — ビルド成功
3. `supabase db push` — マイグレーション適用
4. ローカルE2E（MCP Playwright）:
   - Todoをクリック → アコーディオン展開
   - descriptionを入力 → blur → DB保存確認
   - 別タブでRealtime反映確認
   - ドラッグ&ドロップがアコーディオンと干渉しないこと
5. Vercelデプロイ後、本番E2E検証
