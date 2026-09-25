import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { get } from "svelte/store";
import LeftSidebar from "./LeftSidebar.svelte";
import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { updateDbItemUserSettings } from "@db/dbSettings";
import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
import { storeUserSettings } from "@stores/storeUserSettings";

vi.mock("@db/dbSettings", () => ({ updateDbItemUserSettings: vi.fn() }));
vi.mock("./Header/Header.svelte", () => ({ default: () => {} }));
vi.mock("./Body/Body.svelte", () => ({ default: () => {} }));
vi.mock("./Footer/Footer.svelte", () => ({ default: () => {} }));

function renderSidebar(width: number, isOpenSidebar: boolean): HTMLElement {
  storeNoDbCurrentWidth.set(width);
  storeUserSettings.set({ ...initialDataUserSettings, isOpenSidebar });
  render(LeftSidebar);
  return screen.getByLabelText("Sidebar", { selector: "aside" });
}

describe("LeftSidebar.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
    vi.clearAllMocks();
  });

  test("closes on a click outside on a narrow screen and saves it", async () => {
    renderSidebar(breakPointWidths.sm, true);

    await fireEvent.click(document.body);
    expect(get(storeUserSettings).isOpenSidebar).toBe(false);
    expect(updateDbItemUserSettings).toHaveBeenCalledOnce();
    expect(updateDbItemUserSettings).toHaveBeenCalledWith(
      "isOpenSidebar",
      false,
    );
  });

  test("stays open on a click inside", async () => {
    const sidebar = renderSidebar(breakPointWidths.sm, true);

    await fireEvent.click(sidebar);
    expect(get(storeUserSettings).isOpenSidebar).toBe(true);
    expect(updateDbItemUserSettings).not.toHaveBeenCalled();
  });

  test("stays open on a click outside on a wide screen", async () => {
    renderSidebar(breakPointWidths.sm + 1, true);

    await fireEvent.click(document.body);
    expect(get(storeUserSettings).isOpenSidebar).toBe(true);
    expect(updateDbItemUserSettings).not.toHaveBeenCalled();
  });

  test("does not save on a click outside when it is closed", async () => {
    renderSidebar(breakPointWidths.sm, false);

    await fireEvent.click(document.body);
    expect(updateDbItemUserSettings).not.toHaveBeenCalled();
  });
});
