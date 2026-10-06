import { afterEach, describe, expect, test, vi } from "vitest";
import { customLogger } from "#utils/logger.js";
import {
  copyBlobToClipboard,
  copyTextToClipboard,
  showSnackBarAsCopied,
  showSnackBarAsCopyFailed,
} from "./clipboard";

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

describe("copyBlobToClipboard", () => {
  class FakeClipboardItem {
    constructor(readonly items: Record<string, Promise<Blob>>) {}
  }
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("should give the clipboard the promise of the text at once", async () => {
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      await items[0].items["text/plain"];
    });
    vi.stubGlobal("navigator", { clipboard: { write } });
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const blob: Promise<Blob> = Promise.resolve(new Blob(["abc"]));

    const copied = copyBlobToClipboard(blob);
    expect(write).toHaveBeenCalledWith([
      new FakeClipboardItem({ "text/plain": blob }),
    ]);
    expect(await copied).toBe(showSnackBarAsCopied);
  });

  test("should return the failed snackbar when the text cannot be made", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        write: async (items: FakeClipboardItem[]) => {
          await items[0].items["text/plain"];
        },
      },
    });
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    expect(
      await copyBlobToClipboard(Promise.reject(new Error("worker failed"))),
    ).toBe(showSnackBarAsCopyFailed);
    expect(spyError).toHaveBeenCalledTimes(1);
  });
});
