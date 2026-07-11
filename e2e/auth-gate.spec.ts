import { test, expect } from "@playwright/test";

test("redirects unauthenticated visitors to /login", async ({ page }) => {
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "tolli_admin" })).toBeVisible();
});

test("rejects a wrong password with an inline error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("비밀번호").fill("wrong-password");
  await page.getByRole("button", { name: "입장하기" }).click();
  await expect(page.getByText("비밀번호가 올바르지 않아요.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
