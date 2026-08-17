import { expect, test, type Page } from "@playwright/test";

const errorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  errorsByPage.set(page, browserErrors);
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = errorsByPage.get(page);
  if (
    testInfo.project.name === "owner-desktop-light" &&
    testInfo.title === "keeps deletion retryable when the local Vectorize boundary is unavailable"
  ) {
    if (!errors) throw new Error("Browser error collection was not initialized");
    expect(errors).toHaveLength(1);
    const error = errors[0];
    if (!error) throw new Error("Expected the deletion request to report a 503 console error");
    expect(error).toContain("500 (Internal Server Error)");
    return;
  }
  expect(errors).toEqual([]);
});

test("shows owner-only search, visibility, private content, and deletion controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "AI 问答" })).toBeVisible();

  await page.goto("/articles");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "新建" })).toBeVisible();
  await expect(page.getByRole("link", { name: "私密删除夹具" })).toBeVisible();

  await page.goto("/articles/private-deletion-fixture");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await expect(page.getByRole("heading", { name: "Private deletion fixture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
});

test("opens the owner editor, uses a slash command, and discards the draft", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "owner-desktop-light",
    "One editor interaction run is enough",
  );

  await page.goto("/articles/new");
  await expect(page.getByRole("toolbar", { name: "格式工具" })).toBeVisible();
  await page.getByLabel("标题").fill("编辑器流程草稿");
  await page.getByLabel("标签").fill("engineering/editor");
  const editor = page.locator(".tiptap");
  await editor.click();
  await page.keyboard.type("/");
  const slashMenu = page.getByRole("menu", { name: "斜杠命令" });
  await expect(slashMenu).toBeVisible();
  await slashMenu.getByRole("menuitem", { name: /Heading 1/u }).click();
  await page.keyboard.type("编辑器标题");
  await page.keyboard.press("Enter");
  await page.keyboard.type("编辑器正文");
  await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();
  await page.getByRole("button", { name: "取消" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "放弃未保存的修改？" })).toBeVisible();
  await dialog.getByRole("button", { name: "放弃修改" }).click();
  await expect(page).toHaveURL(/\/articles$/u);
});

test("keeps deletion retryable when the local Vectorize boundary is unavailable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "owner-desktop-light", "One destructive local-boundary run");

  await page.goto("/articles/private-deletion-fixture");
  await page.getByRole("link", { name: "编辑" }).click();
  await page.getByRole("button", { name: "删除" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "删除这篇文章？" })).toBeVisible();
  await dialog.getByRole("button", { name: "删除" }).click();
  await expect(page.getByRole("alert")).toHaveText("文章删除失败，请稍后重试。");
  await expect(page).toHaveURL(/\/articles\/private-deletion-fixture/u);
  await expect(page.getByText("私密", { exact: true })).toBeVisible();
});
