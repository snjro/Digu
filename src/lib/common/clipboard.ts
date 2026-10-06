import type { BaseSnackbarProps } from "#lib/base/snackbarProps.js";
import { customLogger } from "#utils/logger.js";

export const showSnackBarAsCopied: BaseSnackbarProps = {
  visible: true,
  iconProps: {
    name: "checkBold",
    colorCategory: "success",
  },
  text: "Copied",
};

export const showSnackBarAsCopyFailed: BaseSnackbarProps = {
  visible: true,
  iconProps: {
    name: "close",
    colorCategory: "error",
  },
  text: "Copy failed",
};

// Returns the snackbar to show, after the copy has ended.
export async function copyTextToClipboard(
  text: string,
): Promise<BaseSnackbarProps> {
  try {
    await navigator.clipboard.writeText(text);
    return showSnackBarAsCopied;
  } catch (error) {
    customLogger.error("navigator.clipboard.writeText().", error);
    return showSnackBarAsCopyFailed;
  }
}

// A browser with ClipboardItem takes the promise at once, so that a text that
// is made later is still copied by the click. Without it, the copy waits for
// the text.
export async function copyBlobToClipboard(
  blob: Promise<Blob>,
): Promise<BaseSnackbarProps> {
  // The text may fail after the copy has failed.
  blob.catch(() => undefined);
  try {
    if (typeof ClipboardItem === "undefined") {
      await navigator.clipboard.writeText(await (await blob).text());
    } else {
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": blob }),
      ]);
    }
    return showSnackBarAsCopied;
  } catch (error) {
    customLogger.error("navigator.clipboard.write().", error);
    return showSnackBarAsCopyFailed;
  }
}
