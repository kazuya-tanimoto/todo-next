import { expect, test } from "@playwright/test";
import { addTodo, createList, todoItem } from "./helpers/ui";

test.describe("Trash grouping (PBI-021)", () => {
  test("groups individually deleted todos under their source list", async ({ page }) => {
    await page.goto("/");

    const stamp = Date.now();
    const listA = `TrashA-${stamp}`;
    const listB = `TrashB-${stamp}`;
    const todoA = `a-item-${stamp}`;
    const todoB = `b-item-${stamp}`;

    // リストA: Todo追加 → 個別削除。リストは生存させるので orphan todo になる。
    await createList(page, listA);
    await addTodo(page, todoA);
    await todoItem(page, todoA).getByRole("button", { name: "Delete task" }).click();
    await expect(todoItem(page, todoA)).toHaveCount(0);

    // リストB: 別リストでも同様に Todo追加 → 個別削除。
    await createList(page, listB);
    await addTodo(page, todoB);
    await todoItem(page, todoB).getByRole("button", { name: "Delete task" }).click();
    await expect(todoItem(page, todoB)).toHaveCount(0);

    // ゴミ箱を開く。
    await page.getByRole("button", { name: "Trash" }).click();

    // 単独削除Todoが元リストごとの見出し配下にまとまっていること（PBI-021の肝）。
    const groupA = page.getByTestId("trash-group").filter({ hasText: listA });
    const groupB = page.getByTestId("trash-group").filter({ hasText: listB });

    await expect(groupA).toBeVisible();
    await expect(groupB).toBeVisible();

    // A群には todoA だけが入り、todoB は混ざらない。
    await expect(groupA.getByText(todoA)).toBeVisible();
    await expect(groupA.getByText(todoB)).toHaveCount(0);

    // B群には todoB だけが入り、todoA は混ざらない。
    await expect(groupB.getByText(todoB)).toBeVisible();
    await expect(groupB.getByText(todoA)).toHaveCount(0);
  });
});
