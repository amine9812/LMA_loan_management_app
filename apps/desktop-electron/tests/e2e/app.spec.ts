import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { covenantApi: { invoke: (channel: string) => Promise<unknown> } };
    w.covenantApi = {
      invoke: async (channel: string) => {
        if (channel === "auth:me") {
          return { ok: true, data: null };
        }
        if (channel === "auth:login") {
          return {
            ok: true,
            data: {
              sessionId: "test-session",
              user: {
                id: "user-1",
                name: "Test User",
                email: "admin@example.com",
                role: "Admin",
                createdAt: new Date().toISOString()
              }
            }
          };
        }
        if (channel === "alerts:dashboard") {
          return {
            ok: true,
            data: {
              totals: { dueSoon: 0, overdue: 0, waitingReview: 0, breaches: 0, pendingWaivers: 0 },
              loans: [],
              recentActivity: []
            }
          };
        }
        if (channel === "integrations:status") {
          return { ok: true, data: [] };
        }
        if (channel === "loans:list") {
          return { ok: true, data: [] };
        }
        return { ok: true, data: [] };
      }
    };
  });
});

test("login page renders", async ({ page }) => {
  await page.goto("/#/login");
  await expect(page.getByText("Sign in")).toBeVisible();
  await expect(page.getByText("CovenantPulse")).toBeVisible();
});

test("prototype landing renders after login", async ({ page }) => {
  await page.goto("/#/login");
  await page.getByLabel(/email/i).fill("admin@example.com");
  await page.getByLabel(/password/i).fill("Admin123!");
  await page.getByRole("button", { name: "Access CovenantPulse" }).click();
  await page.getByRole("link", { name: "Prototype Mode" }).click();
  await expect(page.getByText("Prototype Mode")).toBeVisible();
});

test("prototype workbench flow renders", async ({ page }) => {
  await page.goto("/#/login");
  await page.getByLabel(/email/i).fill("admin@example.com");
  await page.getByLabel(/password/i).fill("Admin123!");
  await page.getByRole("button", { name: "Access CovenantPulse" }).click();
  await page.getByRole("link", { name: "Prototype Mode" }).click();
  await page.getByRole("link", { name: "Document Workbench" }).click();
  await expect(page.getByText("Document-to-Data Workbench")).toBeVisible();
});
