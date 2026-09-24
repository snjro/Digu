import type { BaseIconProps } from "./BaseIcon";

export type BaseSnackbarProps = {
  visible: boolean;
  text?: string;
  iconProps?: BaseIconProps;
  displayTimeInMilliseconds?: number;
};
