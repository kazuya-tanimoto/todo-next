import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set (check .env).");
}
if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from `supabase status` into .env.local.",
  );
}

// service_role クライアント。RLS をバイパスする。
// アクティブなリストの DELETE は RLS（deleted_at IS NOT NULL 限定）で拒否されるため、
// テストデータの物理削除には service_role が必要。
const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function ensureTestUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw createError ?? new Error("Failed to create the E2E test user.");
  }
  return created.user.id;
}

export async function cleanupUserData(userId: string): Promise<void> {
  // lists を物理削除。FK on delete cascade で todos / tags / todo_tags も消える。
  const { error } = await admin.from("lists").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function upsertProfile(userId: string, displayName: string): Promise<void> {
  // profiles の主キーは id（auth.users.id を参照）。
  // 行が無いと proxy.ts が /profile/setup へリダイレクトしてしまう。
  const { error } = await admin.from("profiles").upsert({ id: userId, display_name: displayName });
  if (error) throw error;
}

// 共有フローE2E用: リスト名から有効な招待トークンを取得する。
// クリップボード（navigator.clipboard）に依存せず DB から直接拾うことで、
// ヘッドレス環境でも安定して member 側の /invite/{token} を開ける。
// リスト名は各テストが一意（Shared-<timestamp>）にするため名前で一意特定できる。
export async function getActiveInviteToken(listName: string): Promise<string> {
  const { data: lists, error: listError } = await admin
    .from("lists")
    .select("id")
    .eq("name", listName)
    .order("created_at", { ascending: false })
    .limit(1);
  if (listError) throw listError;
  if (!lists || lists.length === 0) {
    throw new Error(`No list found with name "${listName}".`);
  }

  const { data: tokens, error: tokenError } = await admin
    .from("invite_tokens")
    .select("token")
    .eq("list_id", lists[0].id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);
  if (tokenError) throw tokenError;
  if (!tokens || tokens.length === 0) {
    throw new Error(`No active invite token for list "${listName}".`);
  }
  return tokens[0].token as string;
}
