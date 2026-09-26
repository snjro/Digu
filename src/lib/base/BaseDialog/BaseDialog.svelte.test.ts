import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseDialog from "./BaseDialog.svelte";
import { closeDialog, openDialog } from "./BaseDialogHandler";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
  vi.restoreAllMocks();
});

type Props = {
  headerText: string | undefined;
  headerIconName?: "cogOutline";
  onclose?: (event: Event) => void;
};

function renderDialog(props: Props) {
  const result = render(BaseDialog, {
    ...props,
    ...slotProps({
      dialogBody: htmlSnippet("<p data-testid='body'>body</p>"),
    }),
  });
  const dialog = result.container.querySelector("dialog")!;
  return { ...result, dialog };
}

// The click goes to the common parent of where the mouse was pressed and
// released. Here one of them always holds the other.
async function pressAndRelease(
  pressed: HTMLElement,
  released: HTMLElement,
): Promise<void> {
  await fireEvent.mouseDown(pressed);
  await fireEvent.mouseUp(released);
  await fireEvent.click(pressed.contains(released) ? pressed : released);
}

describe("BaseDialog.svelte", () => {
  test("shows the header text, the header icon and the slot dialogBody", () => {
    const { dialog, container } = renderDialog({
      headerText: "Settings",
      headerIconName: "cogOutline",
    });
    expect(dialog.contains(screen.getByText("Settings"))).toBe(true);
    expect(dialog.contains(screen.getByTestId("body"))).toBe(true);
    expect(container.querySelector("svg#cogOutline")).not.toBeNull();
  });

  test("shows no header text when there is none", () => {
    renderDialog({ headerText: undefined });
    expect(screen.queryByText("Settings")).toBeNull();
    expect(screen.getByTestId("body")).toBeTruthy();
  });

  test("closes by the close button of the header and calls onclose", async () => {
    const onclose = vi.fn();
    const { dialog } = renderDialog({ headerText: "Settings", onclose });
    dialog.showModal();
    expect(dialog.open).toBe(true);
    await fireEvent.click(screen.getByRole("button"));
    expect(dialog.open).toBe(false);
    expect(onclose).toHaveBeenCalledOnce();
    expect(onclose.mock.calls[0][0]).toBeInstanceOf(Event);
  });

  test("closes on cancel (Escape)", async () => {
    const onclose = vi.fn();
    const { dialog } = renderDialog({ headerText: "Settings", onclose });
    dialog.showModal();
    await fireEvent(dialog, new Event("cancel"));
    expect(dialog.open).toBe(false);
    expect(onclose).toHaveBeenCalledOnce();
  });

  test("closes when the backdrop is pressed and released", async () => {
    const onclose = vi.fn();
    const { dialog } = renderDialog({ headerText: "Settings", onclose });
    openDialog(dialog);
    await pressAndRelease(dialog, dialog);
    expect(dialog.open).toBe(false);
    expect(onclose).toHaveBeenCalledOnce();
  });

  test("stays open when a press inside is released on the backdrop", async () => {
    const { dialog } = renderDialog({ headerText: "Settings" });
    openDialog(dialog);
    await pressAndRelease(screen.getByTestId("body"), dialog);
    expect(dialog.open).toBe(true);
  });

  test("stays open when a press on the backdrop is released inside", async () => {
    const { dialog } = renderDialog({ headerText: "Settings" });
    openDialog(dialog);
    await pressAndRelease(dialog, screen.getByTestId("body"));
    expect(dialog.open).toBe(true);
  });

  test("forgets a press on the backdrop after the click", async () => {
    const { dialog } = renderDialog({ headerText: "Settings" });
    openDialog(dialog);
    await pressAndRelease(dialog, dialog);
    openDialog(dialog);
    // A click with no press, as from a key.
    await fireEvent.click(dialog);
    expect(dialog.open).toBe(true);
  });

  test("adds no listener each time it opens", () => {
    const { dialog } = renderDialog({ headerText: "Settings" });
    const add = vi.spyOn(dialog, "addEventListener");
    openDialog(dialog);
    closeDialog(dialog);
    openDialog(dialog);
    expect(add).not.toHaveBeenCalled();
  });

  test("keeps the same color classes in both themes", async () => {
    const { dialog } = renderDialog({ headerText: "Settings" });
    const category = colorSettings.dialogHeader;
    expect(dialog.classList.contains("shadow-sm")).toBe(true);
    expect(dialog.classList.contains(colorClasses[category].bg)).toBe(true);
    // The dark theme swaps the shadow for a border in CSS.
    expect(dialog.classList.contains("dark:shadow-none")).toBe(true);
    expect(dialog.classList.contains("dark:border")).toBe(true);
    storeUserSettings.updateState({ themeColor: "dark" });
    await Promise.resolve();
    expect(dialog.classList.contains("shadow-sm")).toBe(true);
    expect(dialog.classList.contains(colorClasses[category].bg)).toBe(true);
  });
});
