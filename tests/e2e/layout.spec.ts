import { expect, test } from "./pixel-fixture";

test("hero image and text remain above the following sections at every viewport", async ({ page }) => {
  for (const viewport of [{ width: 3776, height: 1842 }, { width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const banner = page.getByRole("button", { name: "Decline", exact: true });
    if (await banner.isVisible()) await banner.click();
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const hero = rect(".hero"); const visual = rect(".hero-visual"); const image = rect(".hero-visual img");
      return { heroBottom: hero.bottom, visualBottom: visual.bottom, imageBottom: image.bottom, noteBottom: rect(".hero-note").bottom, stripTop: rect(".brand-strip").top, horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    expect(geometry.visualBottom, `visual at ${viewport.width}px`).toBeLessThanOrEqual(geometry.heroBottom + 1);
    expect(geometry.imageBottom, `image at ${viewport.width}px`).toBeLessThanOrEqual(geometry.heroBottom + 1);
    expect(geometry.noteBottom, `text at ${viewport.width}px`).toBeLessThanOrEqual(geometry.heroBottom + 1);
    expect(geometry.stripTop).toBeGreaterThanOrEqual(geometry.heroBottom - 1);
    expect(geometry.horizontalOverflow).toBe(false);
  }
});
