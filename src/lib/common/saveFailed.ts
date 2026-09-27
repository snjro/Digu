import type { BaseSnackbarProps } from "$lib/base/snackbarProps";

export const showSnackBarAsSaveFailed: BaseSnackbarProps = {
  visible: true,
  iconProps: {
    name: "close",
    colorCategory: "error",
  },
  text: "Save failed",
};
