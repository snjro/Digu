import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import { get } from "svelte/store";
import { render } from "@testing-library/svelte";
import BaseSnackbar from "./BaseSnackbar.svelte";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";

// The fly transition is canceled when the test ends, which the browser reports
// as an error. The timing of the snackbar does not depend on it.
vi.mock("svelte/transition", () => ({ fly: () => ({}) }));

async function show(text: string): Promise<void> {
  storeNoDbSnackBar.set({ visible: true, text });
  await tick();
}

describe("BaseSnackbar.svelte", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
  });

  test("hides the snackbar after the display time", async () => {
    render(BaseSnackbar);
    await show("first");
    vi.advanceTimersByTime(999);
    expect(get(storeNoDbSnackBar).visible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(get(storeNoDbSnackBar).visible).toBe(false);
  });

  test("gives a new snackbar its full display time", async () => {
    render(BaseSnackbar);
    await show("first");
    vi.advanceTimersByTime(500);
    await show("second");
    vi.advanceTimersByTime(600);
    expect(get(storeNoDbSnackBar)).toEqual({ visible: true, text: "second" });
    vi.advanceTimersByTime(400);
    expect(get(storeNoDbSnackBar).visible).toBe(false);
  });
});
