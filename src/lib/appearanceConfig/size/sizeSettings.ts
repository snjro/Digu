import { changeSize, type BaseSize } from "$lib/base/baseSizes";

type SizeSettings = Record<
  | "leftSidebarLogo"
  | "leftSidebarButton"
  | "leftSidebarDropdown"
  | "leftSidebarTree1st"
  | "leftSidebarTree2nd"
  | "leftSidebarTree3rd"
  | "leftSidebarTree4th"
  | "leftSidebarChevronIcon"
  | "leftSidebarVersion"
  | "navButton"
  | "navProgressCircle"
  | "navToggle"
  | "navInput"
  | "navInputHelperText"
  | "navSettings"
  | "navText"
  | "breadcrumb"
  | "grid"
  | "gridFunctionButton"
  | "gridFunctionQuickSearch"
  | "abiParamsTable"
  | "abiJsonText"
  | "title"
  | "itemGroup"
  | "itemMember"
  | "itemMemberTable"
  | "itemWarnningMessage"
  | "itemViewAllButton"
  | "tab"
  | "itemTitle"
  | "dialogHeader"
  | "dialogBodyContent"
  | "dialogFooter"
  | "tooltip",
  BaseSize
>;
const sizeLeftSizebar: BaseSize = "lg";
const sizeNav: BaseSize = "md";
const sizeBreadcrumb: BaseSize = "xs";
const sizeGrid: BaseSize = "md";
const sizeAbi: BaseSize = "sm";
const sizeContent: BaseSize = "md";
const sizeDialog: BaseSize = "md";
const sizeTooltip: BaseSize = "sm";
export const sizeSettings: SizeSettings = {
  // leftSidebar
  leftSidebarLogo: changeSize(sizeLeftSizebar, 2),
  leftSidebarButton: changeSize(sizeLeftSizebar, 0),
  leftSidebarDropdown: changeSize(sizeLeftSizebar, -2),
  leftSidebarTree1st: changeSize(sizeLeftSizebar, 0),
  leftSidebarTree2nd: changeSize(sizeLeftSizebar, -1),
  leftSidebarTree3rd: changeSize(sizeLeftSizebar, -2),
  leftSidebarTree4th: changeSize(sizeLeftSizebar, -3),
  leftSidebarVersion: changeSize(sizeLeftSizebar, -1),
  leftSidebarChevronIcon: changeSize(sizeLeftSizebar, -1),
  // nav
  navButton: changeSize(sizeNav, 1),
  navProgressCircle: changeSize(sizeNav, -1),
  navToggle: changeSize(sizeNav, 0),
  navInput: changeSize(sizeNav, 0),
  navInputHelperText: changeSize(sizeNav, -2),
  navSettings: changeSize(sizeNav, -1),
  navText: changeSize(sizeNav, -1),
  //breadcrumb
  breadcrumb: changeSize(sizeBreadcrumb, 0),
  // grid
  grid: changeSize(sizeGrid, -1),
  gridFunctionButton: changeSize(sizeGrid, 0),
  gridFunctionQuickSearch: changeSize(sizeGrid, 0),
  // abi
  abiParamsTable: changeSize(sizeAbi, 0),
  abiJsonText: changeSize(sizeAbi, 0),
  // content
  title: changeSize(sizeContent, 3),
  itemGroup: changeSize(sizeContent, 1),
  itemTitle: changeSize(sizeContent, -1),
  itemMember: changeSize(sizeContent, -1),
  itemMemberTable: changeSize(sizeContent, -1),
  itemWarnningMessage: changeSize(sizeContent, -1),
  itemViewAllButton: changeSize(sizeContent, -1),
  tab: changeSize(sizeContent, -1),
  // dialog
  dialogHeader: changeSize(sizeDialog, 0),
  dialogBodyContent: changeSize(sizeDialog, -1),
  dialogFooter: changeSize(sizeDialog, -1),
  // tooltip
  tooltip: changeSize(sizeTooltip, 0),
};
