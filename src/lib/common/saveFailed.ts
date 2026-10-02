import type { BaseSnackbarProps } from "#lib/base/snackbarProps.js";

export const showSnackBarAsSaveFailed: BaseSnackbarProps = {
  visible: true,
  iconProps: {
    name: "close",
    colorCategory: "error",
  },
  text: "Save failed",
};
