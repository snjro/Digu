import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick, type ComponentProps } from "svelte";
import { get } from "svelte/store";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { goto } from "$app/navigation";
import BaseItem from "./BaseItem.svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { page } from "$app/state";
import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
import { updateDbItemUserSettings } from "@db/dbSettings";
import { storeNoDbCurrentWidth } from "@stores/storeNoDb";

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

const initialWidth: number = get(storeNoDbCurrentWidth);
const HREF = "/eth/Augur-version1";
const OTHER_HREF = "/eth/Augur-version2";
const props: ComponentProps<typeof BaseItem> = {
  label: "Augur version1",
  hrefWithoutUrlHash: HREF,
  size: "md",
};

type Parts = {
  indicator: HTMLElement;
  box: HTMLElement;
  link: HTMLAnchorElement;
  label: HTMLElement;
};
function getParts(container: HTMLElement): Parts {
  const root = container.firstElementChild as HTMLElement;
  const [indicator, box] = [...root.children] as HTMLElement[];
  const link = screen.getByRole("link") as HTMLAnchorElement;
  const label = screen.getByText(props.label);
  return { indicator, box, link, label };
}
// themeColors.css gives these classes the colors of each theme.
const emphasis: string =
  colorClasses[colorSettings.leftSidebarBodyBg].bgEmphasis;
const interactiveText = colorClasses.interactive.text;
const interactiveBorder = colorClasses.interactive.border;

function expectSelected(container: HTMLElement, selected: boolean): void {
  const { indicator, box, link, label } = getParts(container);
  expect(label.classList.contains("font-bold")).toBe(selected);
  expect(link.classList.contains(interactiveText)).toBe(selected);
  expect(box.classList.contains(emphasis)).toBe(selected);
  expect(indicator.classList.contains("h-4/6")).toBe(selected);
}
// The underline is the border of the box around the label.
function isUnderlined(container: HTMLElement): boolean {
  const underline = getParts(container).label.parentElement as HTMLElement;
  return underline.classList.contains(interactiveBorder);
}

describe("BaseItem.svelte", () => {
  beforeEach(() => {
    setPathname("/");
  });
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
    storeNoDbCurrentWidth.set(initialWidth);
    vi.clearAllMocks();
  });

  test.each([undefined, "home"] as const)(
    "shows the label and links to the href. iconName=%s",
    (iconName) => {
      const { container } = render(BaseItem, { ...props, iconName });
      const { link } = getParts(container);
      expect(link.getAttribute("href")).toBe(HREF);
      expect(link.querySelector("svg") !== null).toBe(iconName !== undefined);
    },
  );

  test("adds the url hash to the href", () => {
    const { container } = render(BaseItem, { ...props, urlHash: "abc" });
    expect(getParts(container).link.getAttribute("href")).toBe(`${HREF}#abc`);
  });

  test("is not selected when the page is another one", () => {
    setPathname(`${HREF}/contracts/`);
    const { container } = render(BaseItem, props);
    expectSelected(container, false);
  });

  test.each([undefined, "home"] as const)(
    "is selected when the page is the item. iconName=%s",
    (iconName) => {
      setPathname(`${HREF}/`);
      const { container } = render(BaseItem, { ...props, iconName });
      expectSelected(container, true);
    },
  );

  test("is selected by the href without the url hash", () => {
    setPathname(`${HREF}/`);
    const { container } = render(BaseItem, { ...props, urlHash: "abc" });
    expectSelected(container, true);
  });

  test("updates the selection when the page changes", async () => {
    const { container } = render(BaseItem, props);
    expectSelected(container, false);

    setPathname(`${HREF}/`);
    await tick();
    expectSelected(container, true);

    setPathname(`${OTHER_HREF}/`);
    await tick();
    expectSelected(container, false);
  });

  test("updates the selection when the href changes", async () => {
    setPathname(`${OTHER_HREF}/`);
    const { container, rerender } = render(BaseItem, props);
    expectSelected(container, false);

    await rerender({ ...props, hrefWithoutUrlHash: OTHER_HREF });
    expectSelected(container, true);

    await rerender(props);
    expectSelected(container, false);
  });

  test("emphasizes and underlines the item on hover", async () => {
    const { container } = render(BaseItem, props);
    const { box, link } = getParts(container);
    expect(box.classList).not.toContain(emphasis);
    expect(isUnderlined(container)).toBe(false);

    await fireEvent.mouseEnter(link);
    expect(box.classList).toContain(emphasis);
    expect(isUnderlined(container)).toBe(true);

    await fireEvent.mouseLeave(link);
    expect(box.classList).not.toContain(emphasis);
    expect(isUnderlined(container)).toBe(false);
  });

  test("does not underline the selected item on hover", async () => {
    setPathname(`${HREF}/`);
    const { container } = render(BaseItem, props);

    await fireEvent.mouseEnter(getParts(container).link);
    expect(isUnderlined(container)).toBe(false);
  });

  test("follows hoverType from the parent", async () => {
    const { container, rerender } = render(BaseItem, {
      ...props,
      isHoverControledByParent: true,
    });
    const { box, link } = getParts(container);

    // The mouse does not change it.
    await fireEvent.mouseEnter(link);
    expect(box.classList).not.toContain(emphasis);

    await rerender({
      ...props,
      isHoverControledByParent: true,
      hoverType: "onItem",
    });
    expect(box.classList).toContain(emphasis);
    expect(isUnderlined(container)).toBe(true);
  });

  test("keeps the same color classes in both themes", async () => {
    setPathname(`${HREF}/`);
    const { container } = render(BaseItem, props);
    expect(getParts(container).box.classList).toContain(emphasis);

    storeUserSettings.update((s) => ({ ...s, themeColor: "dark" }));
    await tick();
    expect(getParts(container).box.classList).toContain(emphasis);
  });

  test.each([
    { hasChildren: true, width: "w-fit", rounded: false },
    { hasChildren: false, width: "w-full", rounded: true },
  ])(
    "sizes the button by hasChildren. hasChildren=$hasChildren",
    ({ hasChildren, width, rounded }) => {
      const { container } = render(BaseItem, { ...props, hasChildren });
      const { box, link } = getParts(container);
      expect(link.classList).toContain(width);
      expect(box.classList.contains("rounded-r-md")).toBe(rounded);
    },
  );

  test("leaves the move to the link on click", async () => {
    const { container } = render(BaseItem, { ...props, urlHash: "abc" });

    await fireEvent.click(getParts(container).link);
    expect(goto).not.toHaveBeenCalled();
  });

  test("closes the sidebar on click on a narrow screen", async () => {
    storeNoDbCurrentWidth.set(breakPointWidths.sm);
    storeUserSettings.update((s) => ({ ...s, isOpenSidebar: true }));
    const { container } = render(BaseItem, props);

    await fireEvent.click(getParts(container).link);
    expect(updateDbItemUserSettings).toHaveBeenCalledOnce();
    expect(updateDbItemUserSettings).toHaveBeenCalledWith(
      "isOpenSidebar",
      false,
    );
  });

  test.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])(
    "keeps the sidebar open on a click that does not move this tab. %j",
    async (init) => {
      storeNoDbCurrentWidth.set(breakPointWidths.sm);
      storeUserSettings.update((s) => ({ ...s, isOpenSidebar: true }));
      const { container } = render(BaseItem, props);

      await fireEvent.click(getParts(container).link, init);
      expect(goto).not.toHaveBeenCalled();
      expect(updateDbItemUserSettings).not.toHaveBeenCalled();
    },
  );
});
