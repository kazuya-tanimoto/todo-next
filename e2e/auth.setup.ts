import { type Browser, test as setup } from "@playwright/test";
import { captureAuthCookies } from "./helpers/auth-cookie";
import { cleanupUserData, ensureTestUser, upsertProfile } from "./helpers/supabase-admin";

const authFileA = "e2e/.auth/user.json";
const authFileB = "e2e/.auth/user-b.json";

// owner 用メールから member 用メールを導出する。
// 既存の E2E_TEST_EMAIL/PASSWORD だけで 2 ユーザーを賄えるよう、B は別 env を必須にしない。
// 必要なら E2E_TEST_EMAIL_B / E2E_TEST_PASSWORD_B で上書き可能。
function secondaryEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local}-b@${domain}`;
}

// 1 ユーザー分の seed: ユーザー ensure → 既存データ物理削除 → profiles 保証 →
// 本番同一の認証 cookie を採取し storageState として保存する。
async function seedUser(
  browser: Browser,
  email: string,
  password: string,
  displayName: string,
  authFile: string,
): Promise<void> {
  const userId = await ensureTestUser(email, password);
  await cleanupUserData(userId);
  await upsertProfile(userId, displayName);

  const cookies = await captureAuthCookies(email, password);
  // ユーザーごとに独立した context を起こして storageState を書き出す
  // （アプリは localhost でアクセスするため cookie の url も localhost に揃える）。
  const ctx = await browser.newContext();
  await ctx.addCookies(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      url: "http://localhost:3000",
      httpOnly: false,
      sameSite: "Lax" as const,
    })),
  );
  await ctx.storageState({ path: authFile });
  await ctx.close();
}

setup("authenticate", async ({ browser }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!url || !email || !password) {
    throw new Error(
      "E2E env missing. Set NEXT_PUBLIC_SUPABASE_URL, E2E_TEST_EMAIL, E2E_TEST_PASSWORD in .env.local.",
    );
  }

  // ローカル Supabase が起動しているか確認（未起動なら明確に失敗させる）。
  const health = await fetch(`${url}/auth/v1/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(`Local Supabase not reachable at ${url}. Run \`supabase start\` first.`);
  }

  // owner（A）と member（B）の 2 ユーザーを seed。共有フローの 2 セッション検証に使う。
  // A の cleanup でリスト削除 → list_shares は ON DELETE CASCADE で連動消去されるため、
  // 前回 run で B に共有した行も含めてクリーンになる。
  const emailB = process.env.E2E_TEST_EMAIL_B ?? secondaryEmail(email);
  const passwordB = process.env.E2E_TEST_PASSWORD_B ?? password;

  await seedUser(browser, email, password, "E2E Tester", authFileA);
  await seedUser(browser, emailB, passwordB, "E2E Tester B", authFileB);
});
