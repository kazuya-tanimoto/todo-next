import { expect, test } from "@playwright/test";
import { createList, listItem } from "./helpers/ui";

test.describe("List management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("creates a list and auto-selects it", async ({ page }) => {
    const name = `Groceries-${Date.now()}`;
    await createList(page, name);

    await expect(listItem(page, name)).toBeVisible();
    // 選択されると未選択メッセージは消える。
    await expect(page.getByText("Select a list to get started")).toHaveCount(0);
  });

  test("renames a list", async ({ page }) => {
    const name = `Groceries-${Date.now()}`;
    const renamed = `Shopping-${Date.now()}`;
    await createList(page, name);

    await listItem(page, name)
      .getByRole("button", { name: `Rename ${name}` })
      .click();
    // Rename クリックで list-item が編集フォームに置き換わり input が autoFocus される。
    const editInput = page.locator("input:focus");
    await editInput.fill(renamed);
    await editInput.press("Enter");

    await expect(listItem(page, renamed)).toBeVisible();
    await expect(listItem(page, name)).toHaveCount(0);
  });

  test("deletes a list via confirm dialog", async ({ page }) => {
    const name = `Groceries-${Date.now()}`;
    await createList(page, name);

    // 削除は window.confirm("このリストをゴミ箱に移動しますか？") が出る。
    page.on("dialog", (dialog) => dialog.accept());
    await listItem(page, name)
      .getByRole("button", { name: `Delete ${name}` })
      .click();

    await expect(listItem(page, name)).toHaveCount(0);
  });
});
