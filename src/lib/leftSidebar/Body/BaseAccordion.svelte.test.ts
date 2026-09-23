import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { page } from "$app/stores";
import BaseAccordion from "./BaseAccordion.svelte";
import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

vi.mock("$app/stores", async () => {
  const { writable } = await import("svelte/store");
  return { page: writable({ url: new URL("http://localhost/") }) };
});
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/environment", () => ({ browser: false }));
vi.mock("@routes/+layout", () => ({ trailingSlash: "always" }));
vi.mock("@db/dbSettings", () => ({ updateDbItemUserSettings: vi.fn() }));

const pageStore = page as unknown as Writable<{ url: URL }>;
const setPathname = (pathname: string): void =>
  pageStore.set({ url: new URL(`http://localhost${pathname}`) });

const HREF = "/eth/Augur-version1";
const props = {
  label: "Augur version1",
  hrefWithoutUrlHash: HREF,
  size: "md",
  ...slotProps({ baseAccordionChildren: htmlSnippet("<p>child item</p>") }),
} as const;

function getArrowButton(): HTMLElement {
  return screen.getByRole("button", { name: "" });
}
// The children box is the element with the "hidden" class when closed.
function childrenBox(): HTMLElement {
  const box = screen.getByText("child item").closest(".flex-auto.flex-row");
  if (!box) throw new Error("no children box");
  return box as HTMLElement;
}

describe("BaseAccordion.svelte", () => {
  beforeEach(() => {
    setPathname("/");
  });
  afterEach(() => {
    storeNoDbOpenLeftSidebarAccordion.set(undefined);
  });

  test("renders the label and the children slot", () => {
    render(BaseAccordion, props);
    expect(screen.getByText("Augur version1")).toBeTruthy();
    expect(screen.getByText("child item")).toBeTruthy();
  });

  test("hides the children when the page is not under the item", () => {
    render(BaseAccordion, props);
    expect(childrenBox().classList).toContain("hidden");
  });

  test("shows the children when the page is under the item", () => {
    setPathname(`${HREF}/contracts/`);
    render(BaseAccordion, props);
    expect(childrenBox().classList).not.toContain("hidden");
  });

  test("shows and hides the children when the header is clicked", async () => {
    render(BaseAccordion, props);

    await fireEvent.click(getArrowButton());
    expect(childrenBox().classList).not.toContain("hidden");

    await fireEvent.click(getArrowButton());
    expect(childrenBox().classList).toContain("hidden");
  });

  test("shows the children when all accordions are opened", async () => {
    render(BaseAccordion, props);

    storeNoDbOpenLeftSidebarAccordion.set("openAll");
    await tick();
    expect(childrenBox().classList).not.toContain("hidden");
  });

  test("shows the vertical line by default and hides it by the prop", () => {
    const { unmount } = render(BaseAccordion, props);
    expect(childrenBox().children).toHaveLength(2);
    unmount();

    render(BaseAccordion, { ...props, showVerticalLine: false });
    expect(childrenBox().children).toHaveLength(1);
  });
});
