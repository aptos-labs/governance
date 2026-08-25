import {expect, test} from "@playwright/test";

test("notifications page offers Slack and Telegram subscribe paths", async ({
  page,
}) => {
  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", {name: "Notifications"}),
  ).toBeVisible();
  await expect(page.getByRole("heading", {name: "Slack"})).toBeVisible();
  await expect(page.getByRole("heading", {name: "Telegram"})).toBeVisible();
  await expect(
    page.getByText("Incoming Webhook", {exact: false}),
  ).toBeVisible();
});
