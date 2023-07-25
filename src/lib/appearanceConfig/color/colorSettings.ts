import type { ColorCategory } from "./colorDefinitions";

type ColorSettings = Record<
  | "main"
  | "leftSidebarBorder"
  | "leftSidebarHeader"
  | "leftSidebarBodyBg"
  | "leftSidebarBodyFront"
  | "leftSidebarFooter"
  | "navBg"
  | "navText"
  | "navButton"
  | "navInput"
  | "navSettings"
  | "tabSelected"
  | "tabUnselected"
  | "itemGroupContent"
  | "itemGroupTitle"
  | "itemMemberText"
  | "itemMemberTableBg"
  | "itemMemberTableBorderAndHover"
  | "itemMemberProgressBarFront"
  | "itemMemberProgressBarBg"
  | "gridContainer"
  | "gridFunctionButton"
  | "gridFunctionInput"
  | "gridFunctionInputBorder"
  | "gridHeader"
  | "gridRow"
  | "gridCell"
  | "snackBarFront"
  | "snackBarBg"
  | "dialogHeader"
  | "dialogBody"
  | "progressCircleBg"
  | "tooltip",
  ColorCategory
>;

const colorMain: ColorCategory = "primary";
const colorSub: ColorCategory = "secondary";

export const colorSettings: ColorSettings = {
  //main
  main: colorMain,
  //leftSidebar
  leftSidebarBorder: colorSub,
  leftSidebarHeader: colorSub,
  leftSidebarBodyBg: colorMain,
  leftSidebarBodyFront: colorMain,
  leftSidebarFooter: colorSub,
  // nav
  navBg: colorSub,
  navText: colorSub,
  navButton: colorSub,
  navInput: colorMain,
  navSettings: colorMain,
  //tab
  tabSelected: colorSub,
  tabUnselected: colorMain,
  //item
  itemGroupContent: colorMain,
  itemGroupTitle: colorSub,
  itemMemberText: colorMain,
  itemMemberTableBg: colorMain,
  itemMemberTableBorderAndHover: colorSub,
  itemMemberProgressBarBg: colorSub,
  itemMemberProgressBarFront: colorMain,
  //grid
  gridContainer: colorSub,
  gridFunctionButton: colorSub,
  gridFunctionInput: colorMain,
  gridFunctionInputBorder: colorMain,
  gridHeader: colorSub,
  gridCell: colorMain,
  gridRow: colorMain,
  //snackbar
  snackBarFront: colorSub,
  snackBarBg: colorMain,
  //dialog
  dialogHeader: colorSub,
  dialogBody: colorMain,
  //progressCircle
  progressCircleBg: colorSub,
  //tooltip
  tooltip: colorMain,
};
