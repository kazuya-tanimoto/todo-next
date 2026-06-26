import { expect, test } from "@playwright/test";
import { getActiveInviteToken } from "./helpers/supabase-admin";
import { addTodo, createList, listItem, selectList, todoItem } from "./helpers/ui";

// member（B）用の storageState。auth.setup が owner(user.json) と member(user-b.json) を作る。
const USER_B_STATE = "e2e/.auth/user-b.json";

// 既定の page は owner。member は別 storageState の context を起こして 2 セッションを再現する。
test.describe("Sharing flow", () => {
  // owner がリストを作って招待リンクを発行し、別セッションの member が参加して共有が成立する。
  test("owner invites a member who joins and both see the membership", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    const listName = `Shared-${Date.now()}`;
    await createList(page, listName);

    // owner: 共有ダイアログを開いて招待リンクを作成
    await listItem(page, listName)
      .getByRole("button", { name: `Share ${listName}` })
      .click();
    await page.getByRole("button", { name: "招待リンクを作成" }).click();
    await expect(page.getByText("有効な招待リンク")).toBeVisible();

    // token は service_role で DB から取得（クリップボード依存を避ける）
    const token = await getActiveInviteToken(listName);

    // member（B）: 別セッションで招待を受ける
    const ctxB = await browser.newContext({ storageState: USER_B_STATE });
    const pageB = await ctxB.newPage();
    try {
      await pageB.goto(`/invite/${token}`);
      await expect(pageB.getByText(listName)).toBeVisible();
      await pageB.getByRole("button", { name: "参加する" }).click();

      // B はホームに戻り、共有リスト（🤝 = aria-label "Shared"）が見える
      await expect(listItem(pageB, listName)).toBeVisible();
      await expect(listItem(pageB, listName).locator('[aria-label="Shared"]')).toBeVisible();

      // owner はダイアログを開き直すと、メンバーが owner + B の 2 名になる
      // （初回オープン時は owner のみで "メンバー (1)" なので、再取得で 2 に増えることも確認できる）。
      await page.getByRole("button", { name: "Close" }).click();
      await listItem(page, listName)
        .getByRole("button", { name: `Share ${listName}` })
        .click();
      await expect(page.getByText("メンバー (2)")).toBeVisible();
      await expect(page.getByText("E2E Tester B")).toBeVisible();
    } finally {
      await ctxB.close();
    }
  });

  // 共有メンバーが追加した Todo が owner からも見える（共有リストへの書き込み権限を検証）。
  test("a shared member can add a todo the owner sees", async ({ page, browser }) => {
    await page.goto("/");
    const listName = `Shared-${Date.now()}`;
    await createList(page, listName);

    await listItem(page, listName)
      .getByRole("button", { name: `Share ${listName}` })
      .click();
    await page.getByRole("button", { name: "招待リンクを作成" }).click();
    await expect(page.getByText("有効な招待リンク")).toBeVisible();
    const token = await getActiveInviteToken(listName);
    // 次の選択操作の妨げにならないよう owner 側のダイアログは閉じておく
    await page.getByRole("button", { name: "Close" }).click();

    const ctxB = await browser.newContext({ storageState: USER_B_STATE });
    const pageB = await ctxB.newPage();
    try {
      await pageB.goto(`/invite/${token}`);
      await pageB.getByRole("button", { name: "参加する" }).click();
      await expect(listItem(pageB, listName)).toBeVisible();

      // member が共有リストへ Todo 追加（join 後 localStorage で自動選択されるが、明示選択で確実化）
      await selectList(pageB, listName);
      const todoText = `Shared task ${Date.now()}`;
      await addTodo(pageB, todoText);

      // owner 側で reload → 同リストを選択すると member の Todo が見える
      // （Realtime に頼らず、再取得で決定的に確認する）。
      await page.reload();
      await selectList(page, listName);
      await expect(todoItem(page, todoText)).toBeVisible();
    } finally {
      await ctxB.close();
    }
  });
});
