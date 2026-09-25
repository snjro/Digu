import type { BaseSnackbarProps } from "$lib/base/snackbarProps";
import { customLogger } from "@utils/logger";

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
