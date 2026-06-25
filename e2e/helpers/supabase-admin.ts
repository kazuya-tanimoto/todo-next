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
