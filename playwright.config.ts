import nextEnv from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// .env / .env.local を読み込む（SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_* を含む）。
// @next/env は CommonJS のため、ESM 文脈の Playwright config では default import 経由で使う。
// yarn dev 側も Next が同ファイルを自動ロードするため二重設定は不要。
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./e2e",
  // 単一テストユーザーを共有するため当面は直列実行（将来ユーザー分離で並列化可）。
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "html",
  use: {
    // アプリは必ず localhost でアクセスする（cookie domain が localhost のため。
    // 127.0.0.1 だと認証 cookie がリクエストに乗らず proxy が未認証判定する）。
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
