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

    // ゴミ箱を開く。リスト名が "Trash..." で始まるとリスト項目やその
    // Share/Rename/Delete ボタン（aria-label に名前を含む）も部分一致してしまうため、
    // exact: true でトグルボタン（accessible name がちょうど "Trash"）だけに絞る。
    await page.getByRole("button", { name: "Trash", exact: true }).click();

    // 単独削除Todoが元リストごとの見出し配下にまとまっていること（PBI-021の肝）。
    const groupA = page.getByTestId("trash-group").filter({ hasText: listA });
    const groupB = page.getByTestId("trash-group").filter({ hasText: listB });

    await expect(groupA).toBeVisible();
    await expect(groupB).toBeVisible();

    // グループ要素のテキスト内包で検証する。getByText の部分一致は入れ子要素に
    // 多重ヒットして toBeVisible が strict-mode 違反になりうるため使わない。
    // A群には todoA だけが入り、todoB は混ざらない。
    await expect(groupA).toContainText(todoA);
    await expect(groupA).not.toContainText(todoB);

    // B群には todoB だけが入り、todoA は混ざらない。
    await expect(groupB).toContainText(todoB);
    await expect(groupB).not.toContainText(todoA);
  });

  test("trash delete buttons stay visible in Mono theme (PBI-020-type regression)", async ({
    page,
  }) => {
    await page.goto("/");

    const stamp = Date.now();
    const list = `TrashTheme-${stamp}`;
    const todo = `theme-item-${stamp}`;

    await createList(page, list);
    await addTodo(page, todo);
    await todoItem(page, todo).getByRole("button", { name: "Delete task" }).click();
    await expect(todoItem(page, todo)).toHaveCount(0);

    // 既定テーマは brutal（theme-delete が常時表示）。Mono/Natural は .theme-delete が
    // opacity:0 で、ホバー非依存の表示が無いとゴミ箱の削除ボタンが透明になる回帰を防ぐ。
    // toBeVisible は opacity:0 を不可視扱いしないため、computed opacity を直接検証する。
    await page.getByRole("button", { name: /Mono/ }).click();
    await page.getByRole("button", { name: "Trash", exact: true }).click();

    const group = page.getByTestId("trash-group").filter({ hasText: list });
    await expect(group).toBeVisible();
    await expect(group.getByRole("button", { name: "Delete" }).first()).toHaveCSS("opacity", "1");
  });
});
