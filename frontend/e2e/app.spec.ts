import { expect, test } from "@playwright/test";

test("loads the playground shell", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Move Playground")).toBeVisible();
    await expect(page.getByRole("button", { name: "Run" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Test" })).toBeVisible();
});
