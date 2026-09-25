import { afterEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { fireEvent, render, screen } from "@testing-library/svelte";
import CommonCopyButton from "./CommonCopyButton.svelte";
import type { BaseSnackbarProps } from "$lib/base/snackbarProps";
import { copyTextToClipboard } from "$lib/common/clipboard";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";

vi.mock("$lib/common/clipboard", () => ({ copyTextToClipboard: vi.fn() }));

const copyFailed: BaseSnackbarProps = {
  visible: true,
  text: "Copy failed",
};

describe("CommonCopyButton.svelte", () => {
  afterEach(() => {
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    vi.clearAllMocks();
  });

  test("shows the snackbar returned by copyTextToClipboard on click", async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValueOnce(copyFailed);
    render(CommonCopyButton, { copyTarget: "0xabc", size: "md" });

    await fireEvent.click(screen.getByRole("button"));
    expect(copyTextToClipboard).toHaveBeenCalledWith("0xabc");
    await vi.waitFor(() => {
      expect(get(storeNoDbSnackBar)).toBe(copyFailed);
    });
  });
});
