import type { BaseIconProps } from "$lib/base/BaseIcon";

type DirectoryItem = {
  path: string;
  label: string;
  iconName: BaseIconProps["name"] | undefined;
};
export const directoryItems: {
  [key: string]: DirectoryItem;
} = {
  home: {
    path: "home",
    label: "Home",
    iconName: "home",
  },
  // blocknumberAndDatetime: {
  //   path: "blocknumberAndDatetime",
  //   label: "Block Number & Datetime",
  //   iconName: undefined,
  // },
};
