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
});
