import { expect, type Locator, type Page } from "@playwright/test";

export function listItem(page: Page, name: string): Locator {
  return page.getByTestId("list-item").filter({ hasText: name });
}

export function todoItem(page: Page, text: string): Locator {
  return page.getByTestId("todo-item").filter({ hasText: text });
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
