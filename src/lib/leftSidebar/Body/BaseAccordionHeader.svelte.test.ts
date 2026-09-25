import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick, type ComponentProps } from "svelte";
import { fireEvent, render, screen } from "@testing-library/svelte";
import BaseAccordionHeader from "./BaseAccordionHeader.svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
import { storeUserSettings } from "@stores/storeUserSettings";
import { page } from "$app/state";

// page of $app/state is not a store. SvelteURL makes page.url reactive.
vi.mock("$app/state", async () => {
  const { SvelteURL } = await import("svelte/reactivity");
  return { page: { url: new SvelteURL("http://localhost/") } };
});
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/environment", () => ({ browser: false }));
vi.mock("@routes/+layout", () => ({ trailingSlash: "always" }));
vi.mock("@db/dbSettings", () => ({ updateDbItemUserSettings: vi.fn() }));

const setPathname = (pathname: string): void => {
  page.url.href = `http://localhost${pathname}`;
};

const HREF = "/eth/Augur-version1";
const props: ComponentProps<typeof BaseAccordionHeader> = {
  label: "Augur version1",
  hrefWithoutUrlHash: HREF,
  urlHash: undefined,
  size: "md",
  iconName: undefined,
  isTopLevelItem: true,
  suffixIcons: [],
  isOpenAccordion: false,
};

function getArrowButton(): HTMLElement {
  return screen.getByRole("button", { name: "Toggle Augur version1" });
}
function chevron(): "open" | "closed" {
  const arrow = getArrowButton();
  if (arrow.querySelector("svg#chevronDown")) return "open";
  if (arrow.querySelector("svg#chevronRight")) return "closed";
  throw new Error("no chevron");
}
const emphasis = (theme: "light" | "dark"): string =>
  colorDefinitions[theme][colorSettings.leftSidebarBodyBg].bgEmphasis;

describe("BaseAccordionHeader.svelte", () => {
  beforeEach(() => {
    setPathname("/");
  });
  afterEach(() => {
    storeNoDbOpenLeftSidebarAccordion.set(undefined);
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("shows the label", () => {
    render(BaseAccordionHeader, props);
    expect(screen.getByText("Augur version1")).toBeTruthy();
  });

  test("starts closed when the page is not under the item", () => {
    setPathname("/eth/");
    render(BaseAccordionHeader, { ...props, isOpenAccordion: true });
    expect(chevron()).toBe("closed");
  });

  test("starts open when the page is under the item", () => {
    setPathname(`${HREF}/contracts/`);
    render(BaseAccordionHeader, props);
    expect(chevron()).toBe("open");
  });

  test("starts closed and emphasized when the item itself is selected", () => {
    setPathname(`${HREF}/`);
    render(BaseAccordionHeader, { ...props, isOpenAccordion: true });
    expect(chevron()).toBe("closed");
    expect(getArrowButton().classList).toContain(emphasis("light"));
  });

  test("updates the emphasis when the page changes", async () => {
    render(BaseAccordionHeader, props);
    expect(getArrowButton().classList).not.toContain(emphasis("light"));

    setPathname(`${HREF}/`);
    await tick();
    expect(getArrowButton().classList).toContain(emphasis("light"));
  });

  test("flips the accordion on click", async () => {
    render(BaseAccordionHeader, props);
    expect(chevron()).toBe("closed");
    expect(getArrowButton().getAttribute("aria-expanded")).toBe("false");

    await fireEvent.click(getArrowButton());
    expect(chevron()).toBe("open");
    expect(getArrowButton().getAttribute("aria-expanded")).toBe("true");

    await fireEvent.click(getArrowButton());
    expect(chevron()).toBe("closed");
    expect(getArrowButton().getAttribute("aria-expanded")).toBe("false");
  });

  test.each(["Enter", " "])(
    "flips the accordion on the %j key",
    async (key) => {
      render(BaseAccordionHeader, props);
      await fireEvent.keyDown(getArrowButton(), { key });
      expect(chevron()).toBe("open");
    },
  );

  test("ignores other keys", async () => {
    render(BaseAccordionHeader, props);
    await fireEvent.keyDown(getArrowButton(), { key: "a" });
    expect(chevron()).toBe("closed");
  });

  test("emphasizes the arrow and underlines the chevron on hover", async () => {
    render(BaseAccordionHeader, props);
    const arrow = getArrowButton();
    const chevronSvg = () => arrow.querySelector("svg#chevronRight");
    expect(arrow.classList).not.toContain(emphasis("light"));
    expect(chevronSvg()?.classList).not.toContain("border-b");

    await fireEvent.mouseEnter(arrow);
    expect(arrow.classList).toContain(emphasis("light"));
    expect(chevronSvg()?.classList).toContain("border-b");

    await fireEvent.mouseLeave(arrow);
    expect(arrow.classList).not.toContain(emphasis("light"));
    expect(chevronSvg()?.classList).not.toContain("border-b");
  });

  test("follows the theme while hovered", async () => {
    render(BaseAccordionHeader, props);
    await fireEvent.mouseEnter(getArrowButton());

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(getArrowButton().classList).toContain(emphasis("dark"));
  });

  test("opens and closes all by storeNoDbOpenLeftSidebarAccordion", async () => {
    render(BaseAccordionHeader, props);

    storeNoDbOpenLeftSidebarAccordion.set("openAll");
    await tick();
    expect(chevron()).toBe("open");

    storeNoDbOpenLeftSidebarAccordion.set("closeAll");
    await tick();
    expect(chevron()).toBe("closed");
  });

  test("opens only the current directory by storeNoDbOpenLeftSidebarAccordion", async () => {
    render(BaseAccordionHeader, props);
    await fireEvent.click(getArrowButton());
    expect(chevron()).toBe("open");

    // The page is not under the item, so "openCurrentOnly" closes it.
    storeNoDbOpenLeftSidebarAccordion.set("openCurrentOnly");
    await tick();
    expect(chevron()).toBe("closed");
  });

  test("renders the suffix icons", () => {
    render(BaseAccordionHeader, {
      ...props,
      suffixIcons: [
        { name: "databaseOutline", size: "sm" },
        { name: "function", size: "sm" },
      ],
    });
    const arrow = getArrowButton();
    expect(arrow.querySelector("svg#databaseOutline")).not.toBeNull();
    expect(arrow.querySelector("svg#function")).not.toBeNull();
  });
});
