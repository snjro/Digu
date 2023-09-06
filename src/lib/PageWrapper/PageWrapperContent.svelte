<script lang="ts" context="module">
  export type TabsDefinition = {
    selectedTabName: TabContent["name"];
    tabContents: TabContent[];
    groupName: string;
  };
  type TabContent = {
    name: TabNameContract | TabNameEvent | TabNameFunction;
    isAgGrid: boolean;
    gridCols: "grid-cols-1" | "grid-cols-2" | "grid-cols-6" | undefined;
  };
  type TabNameCommon = "Overview" | "ABI";
  type TabNameContract = TabNameCommon;
  type TabNameEvent = TabNameCommon | "Event Logs (text)" | "Event Logs (hex)";
  type TabNameFunction = TabNameCommon;
</script>

<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";

  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { getScrollbarStyle } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let isAgGrid: boolean = false;
  export let hasMultipulTabs: boolean = true;
  export let gridCols:
    | "grid-cols-1"
    | "grid-cols-2"
    | "grid-cols-6"
    | undefined = undefined;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

  let scrollStyle: string;
  $: scrollStyle = classNames(
    "overflow-scroll",
    getScrollbarStyle(colorSettings.tabSelected, themeColor).thin,
  );

  // when showing Ag-Grid, flex style need to be "flex-auto".
  let flexStyleForGrid: "flex-auto" | "flex-initial";
  $: flexStyleForGrid = isAgGrid ? "flex-auto" : "flex-initial";

  let gridMain: string | undefined;
  $: gridMain = gridCols
    ? classNames("grid", gridCols, "grid-flow-dense", "gap-1.5")
    : undefined;
</script>

<div
  class={classNames(
    flexStyleForGrid,
    "min-h-0",
    "h-fit w-full flex flex-col",
    "pt-1.5",
    "pl-1.5",
    "rounded-tr",
    "rounded-b",
    hasMultipulTabs ? "rounded-tl-none" : "rounded-tl",
    colorDefinitions[themeColor][colorSettings.tabSelected].bg,
    "",
  )}
>
  <!-- function bar -->
  <slot name="PageWrapperContentFunctionBar" />
  <!-- content with scrollbar -->
  <div
    class={classNames("flex-auto min-h-0", "h-full w-full", scrollStyle, "")}
  >
    <div class={classNames(gridMain, "w-full", "h-full", "")}>
      <slot name="PageWrapperContentBody" />
    </div>
  </div>
  <!-- footer -->
  <slot name="PageWrapperContentFooter" />
</div>
