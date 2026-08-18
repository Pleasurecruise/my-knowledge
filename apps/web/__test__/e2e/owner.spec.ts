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

test("shows owner-only knowledge, visibility, and deletion controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "搜索文章" }).fill("私密删除");
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(page.getByRole("link", { name: "私密删除夹具" })).toBeVisible();

  await page.goto("/articles");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "新建" })).toBeVisible();
  await expect(page.getByRole("link", { name: "私密删除夹具" })).toBeVisible();
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New" })).toHaveCount(0);

  await page.goto("/articles/private-deletion-fixture");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "私密删除夹具" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
});

test("opens the owner editor, uses a slash command, and discards the draft", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "owner-desktop-light",
    "One editor interaction run is enough",
  );

  await page.goto("/articles/new");
  const toolbar = page.getByRole("toolbar", { name: "格式工具" });
  await expect(toolbar).toBeVisible();
  const [editorBox, headerBox, tagsBox, toolbarBox] = await Promise.all([
    page.getByRole("region", { name: "正文" }).boundingBox(),
    page.getByRole("banner").locator(":scope > div").boundingBox(),
    page.getByLabel("标签").boundingBox(),
    toolbar.boundingBox(),
  ]);
  if (!editorBox || !headerBox || !tagsBox || !toolbarBox)
    throw new Error("New article layout was not measurable");
  expect(editorBox.x).toBeCloseTo(headerBox.x, 0);
  expect(editorBox.x + editorBox.width).toBeCloseTo(headerBox.x + headerBox.width, 0);
  expect(tagsBox.x + tagsBox.width).toBeGreaterThan(toolbarBox.x + toolbarBox.width - 2);
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
