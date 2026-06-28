import { expect, test } from "@playwright/test";
import { addTodo, createList, todoItem } from "./helpers/ui";

test.describe("Todo CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 一意名のリストを作って自動選択させ、各テストを自分のリストにスコープする。
    await createList(page, `CRUD-${Date.now()}`);
  });

  test("adds a todo and disables Add when input is empty", async ({ page }) => {
    const form = page.locator("form", { has: page.getByPlaceholder("What needs to be done?") });
    await expect(form.getByRole("button", { name: "Add" })).toBeDisabled();

    await addTodo(page, "Buy milk");
    await expect(todoItem(page, "Buy milk")).toBeVisible();
    await expect(page.getByText("0/1 completed")).toBeVisible();
  });

  test("toggles a todo to completed", async ({ page }) => {
    await addTodo(page, "Buy milk");
    const item = todoItem(page, "Buy milk");

    // controlled checkbox: onChange が非同期(DB往復)で state を更新するため、
    // .check() は click 直後に checked にならず失敗する。click + web-first assertion で待つ。
    await item.getByRole("checkbox").click();
    await expect(item.getByRole("checkbox")).toBeChecked();
    await expect(page.getByText("1/1 completed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear completed (1)" })).toBeVisible();
  });

  test("edits a todo title inline", async ({ page }) => {
    await addTodo(page, "Buy milk");
    await todoItem(page, "Buy milk")
      .getByRole("button", { name: /Buy milk/ })
      .dblclick();

    const editBox = page.getByRole("textbox", { name: "Edit todo" });
    await editBox.fill("Buy oat milk");
    await editBox.press("Enter");

    await expect(todoItem(page, "Buy oat milk")).toBeVisible();
    await expect(todoItem(page, "Buy milk")).toHaveCount(0);
  });

  test("deletes a todo", async ({ page }) => {
    await addTodo(page, "Buy milk");
    await todoItem(page, "Buy milk").getByRole("button", { name: "Delete task" }).click();

    await expect(todoItem(page, "Buy milk")).toHaveCount(0);
    await expect(page.getByText("No tasks yet. Add something!")).toBeVisible();
    await expect(page.getByText("Empty list. Time to add tasks!")).toBeVisible();
  });

  test("clears completed todos after confirming the dialog", async ({ page }) => {
    await addTodo(page, "Done task");
    await addTodo(page, "Pending task");

    // 「Done task」だけ完了にする
    const done = todoItem(page, "Done task");
    await done.getByRole("checkbox").click();
    await expect(done.getByRole("checkbox")).toBeChecked();

    // Clear completed は window.confirm を出すので accept を登録してから押す
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Clear completed (1)" }).click();

    // 完了済みのみゴミ箱へ移動、未完了は残る
    await expect(todoItem(page, "Done task")).toHaveCount(0);
    await expect(todoItem(page, "Pending task")).toBeVisible();
    await expect(page.getByText("0/1 completed")).toBeVisible();
  });

  test("keeps completed todos when the clear dialog is dismissed", async ({ page }) => {
    await addTodo(page, "Keep me");
    const item = todoItem(page, "Keep me");
    await item.getByRole("checkbox").click();
    await expect(item.getByRole("checkbox")).toBeChecked();

    // 確認ダイアログをキャンセルしたら完了済みTodoは残る
    page.on("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Clear completed (1)" }).click();

    await expect(todoItem(page, "Keep me")).toBeVisible();
    await expect(page.getByText("1/1 completed")).toBeVisible();
  });
});
