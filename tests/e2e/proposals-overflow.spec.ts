import {expect, test} from "@playwright/test";

async function horizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      innerWidth: window.innerWidth,
      documentScrollWidth: root.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });
}

test("proposals list does not overflow on desktop and stacks on mobile", async ({
  page,
}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto("/");
  await expect(page.getByTestId("proposals-table")).toBeVisible();
  await expect(page.getByTestId("proposals-mobile-list")).toBeHidden();

  const desktop = await horizontalOverflow(page);
  expect(desktop.documentScrollWidth).toBeLessThanOrEqual(
    desktop.innerWidth + 1,
  );

  await page.getByTestId("proposals-table").screenshot({
    path: "tests/e2e/artifacts/proposals-desktop.png",
  });

  await page.setViewportSize({width: 320, height: 844});
  await expect(
    page.getByRole("img", {name: "Aptos Governance"}),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {name: "Connect Wallet"}),
  ).toBeVisible();
  await expect(page.getByTestId("proposals-mobile-list")).toBeVisible();
  await expect(page.getByTestId("proposals-table")).toBeHidden();
  await expect(
    page.getByTestId("proposals-mobile-list").getByRole("link").first(),
  ).toBeVisible();

  const mobile = await horizontalOverflow(page);
  expect(mobile.documentScrollWidth).toBeLessThanOrEqual(mobile.innerWidth + 1);

  await page.getByTestId("proposals-mobile-list").screenshot({
    path: "tests/e2e/artifacts/proposals-mobile.png",
  });

  await page
    .getByTestId("proposals-mobile-list")
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/\/proposal\//);
});
