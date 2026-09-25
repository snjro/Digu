import { afterEach, describe, expect, test, vi } from "vitest";
import { showSnackBarAsCopied } from "$lib/common/CommonCopyButton.svelte";
import { customLogger } from "@utils/logger";
import { copyTextToClipboard, showSnackBarAsCopyFailed } from "./clipboard";

function stubWriteText(writeText: (text: string) => Promise<void>): void {
  vi.stubGlobal("navigator", { clipboard: { writeText } });
}

describe("copyTextToClipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("should copy the text and return the copied snackbar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubWriteText(writeText);
    expect(await copyTextToClipboard("abc")).toBe(showSnackBarAsCopied);
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  test("should return the failed snackbar when the copy fails", async () => {
    stubWriteText(vi.fn().mockRejectedValue(new Error("denied")));
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    expect(await copyTextToClipboard("abc")).toBe(showSnackBarAsCopyFailed);
    expect(spyError).toHaveBeenCalledTimes(1);
  });

  test("should wait for the copy before returning", async () => {
    let finish: () => void = () => {};
    stubWriteText(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    let result: unknown = undefined;
    const copy = copyTextToClipboard("abc").then((value) => {
      result = value;
    });
    await Promise.resolve();
    expect(result).toBeUndefined();
    finish();
    await copy;
    expect(result).toBe(showSnackBarAsCopied);
  });
});
