import { test as setup } from "@playwright/test";
import { captureAuthCookies } from "./helpers/auth-cookie";
import { cleanupUserData, ensureTestUser, upsertProfile } from "./helpers/supabase-admin";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ context }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!url || !email || !password) {
    throw new Error(
      "E2E env missing. Set NEXT_PUBLIC_SUPABASE_URL, E2E_TEST_EMAIL, E2E_TEST_PASSWORD in .env.local.",
    );
  }

  // 0. ローカル Supabase が起動しているか確認（未起動なら明確に失敗させる）。
  const health = await fetch(`${url}/auth/v1/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(`Local Supabase not reachable at ${url}. Run \`supabase start\` first.`);
  }

  // 1-3. テストユーザーを用意 → 既存データを物理削除 → profiles 行を保証。
  const userId = await ensureTestUser(email, password);
  await cleanupUserData(userId);
  await upsertProfile(userId, "E2E Tester");

  // 4. 本番同一の認証 cookie を採取し、storageState として保存する。
  //    アプリは localhost でアクセスするため cookie の url も localhost に揃える。
  const cookies = await captureAuthCookies(email, password);
  await context.addCookies(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      url: "http://localhost:3000",
      httpOnly: false,
      sameSite: "Lax" as const,
    })),
  );
  await context.storageState({ path: authFile });
});
