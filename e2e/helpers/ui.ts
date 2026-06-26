import { expect, type Locator, type Page } from "@playwright/test";

export function listItem(page: Page, name: string): Locator {
  return page.getByTestId("list-item").filter({ hasText: name });
}

export function todoItem(page: Page, text: string): Locator {
  return page.getByTestId("todo-item").filter({ hasText: text });
}

// リスト名のテキストをクリックして選択する。list-item 内の名前 span だけを狙い、
// 右側の Share/Rename/Delete ボタンや親 div との strict-mode 衝突を避ける。
// （list-item div 自身もテキストが name と一致しうるため、span に限定する。）
// reload 後の再選択や join 後の確実な選択に使う。
export async function selectList(page: Page, name: string): Promise<void> {
  await listItem(page, name).locator("span").filter({ hasText: name }).click();
}

// リストを作成する。作成後はそのリストが自動選択される（ListSelector.createList）。
export async function createList(page: Page, name: string): Promise<void> {
  const form = page.locator("form", { has: page.getByPlaceholder("New list name...") });
  await form.getByPlaceholder("New list name...").fill(name);
  await form.getByRole("button", { name: "Add" }).click();
  await expect(listItem(page, name)).toBeVisible();
}

// 選択中リストに Todo を追加する。Add ボタンは3箇所にあるためフォームでスコープする。
export async function addTodo(page: Page, text: string): Promise<void> {
  const form = page.locator("form", { has: page.getByPlaceholder("What needs to be done?") });
  await form.getByPlaceholder("What needs to be done?").fill(text);
  await form.getByRole("button", { name: "Add" }).click();
  await expect(todoItem(page, text)).toBeVisible();
}
