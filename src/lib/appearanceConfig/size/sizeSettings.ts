import { changeSize, type BaseSize } from "$lib/base/baseSizes";

type SizeSettings = Record<
  | "leftSidebarLogo"
  | "leftSidebarButton"
  | "leftSidebarDropdown"
  | "leftSidebarTree1st"
  | "leftSidebarTree2nd"
  | "leftSidebarTree3rd"
  | "leftSidebarVersion"
  | "navButton"
  | "navProgressBar"
  | "navToggle"
  | "navInput"
  | "navInputHelperText"
  | "navSettings"
  | "navText"
  | "breadcrumb"
  | "grid"
  | "gridFunctionButton"
  | "gridFunctionQuickSearch"
  | "title"
  | "itemGroup"
  | "itemMember"
  | "itemMemberTable"
  | "itemWarnningMessage"
  | "itemViewAllButton"
  | "abiParamsTable"
  | "tab"
  | "itemTitle"
  | "dialogHeader"
  | "dialogBodyContent"
  | "dialogFooter",
  BaseSize
>;
const sizeLeftSizebar: BaseSize = "lg";
const sizeNav: BaseSize = "lg";
const sizeBreadcrumb: BaseSize = "xs";
const sizeGrid: BaseSize = "md";
const sizeContent: BaseSize = "md";
const sizeDialog: BaseSize = "md";
export const sizeSettings: SizeSettings = {
  // leftSidebar
  leftSidebarLogo: changeSize(sizeLeftSizebar, 2),
  leftSidebarButton: changeSize(sizeLeftSizebar, 0),
  leftSidebarDropdown: changeSize(sizeLeftSizebar, -2),
  leftSidebarTree1st: changeSize(sizeLeftSizebar, 0),
  leftSidebarTree2nd: changeSize(sizeLeftSizebar, -1),
  leftSidebarTree3rd: changeSize(sizeLeftSizebar, -2),
  leftSidebarVersion: changeSize(sizeLeftSizebar, -1),
  // nav
  navButton: changeSize(sizeNav, 0),
  navProgressBar: changeSize(sizeNav, -1),
  navToggle: changeSize(sizeNav, -1),
  navInput: changeSize(sizeNav, -1),
  navInputHelperText: changeSize(sizeNav, -2),
  navSettings: changeSize(sizeNav, -1),
  navText: changeSize(sizeNav, -2),
  //breadcrumb
  breadcrumb: changeSize(sizeBreadcrumb, 0),
  // grid
  grid: changeSize(sizeGrid, -1),
  gridFunctionButton: changeSize(sizeGrid, 2),
  gridFunctionQuickSearch: changeSize(sizeGrid, 0),
  // content
  title: changeSize(sizeContent, 3),
  itemGroup: changeSize(sizeContent, 2),
  itemMember: changeSize(sizeContent, 0),
  itemMemberTable: changeSize(sizeContent, -1),
  itemWarnningMessage: changeSize(sizeContent, -1),
  itemViewAllButton: changeSize(sizeContent, -1),
  abiParamsTable: changeSize(sizeContent, -1),
  tab: changeSize(sizeContent, -1),
  itemTitle: changeSize(sizeContent, 1),
  // dialog
  dialogHeader: changeSize(sizeDialog, 1),
  dialogBodyContent: changeSize(sizeDialog, -1),
  dialogFooter: changeSize(sizeDialog, 0),
};
