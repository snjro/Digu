<script lang="ts" module>
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
  import type { Snippet } from "svelte";
  import { focusableWhenScrolling } from "$lib/base/focusableWhenScrolling";

  interface Props {
    isAgGrid?: boolean;
    hasMultipulTabs?: boolean;
    gridCols?: "grid-cols-1" | "grid-cols-2" | "grid-cols-6" | undefined;
    PageWrapperContentFunctionBar?: Snippet;
    PageWrapperContentBody?: Snippet;
    PageWrapperContentFooter?: Snippet;
    scrollAreaLabel?: string;
  }

  let {
    isAgGrid = false,
    hasMultipulTabs = true,
    gridCols = undefined,
    PageWrapperContentFunctionBar,
    PageWrapperContentBody,
    PageWrapperContentFooter,
    scrollAreaLabel = "Content",
  }: Props = $props();

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let scrollStyle: string = $derived(
    classNames(
      "overflow-scroll",
      getScrollbarStyle(colorSettings.tabSelected, themeColor).thin,
    ),
  );

  // when showing Ag-Grid, flex style need to be "flex-auto".
  let flexStyleForGrid: "flex-auto" | "flex-initial" = $derived(
    isAgGrid ? "flex-auto" : "flex-initial",
  );

  let gridMain: string | undefined = $derived(
    gridCols
      ? classNames("grid", gridCols, "grid-flow-dense", "gap-1.5")
      : undefined,
  );
</script>

<div
  class={classNames(
    flexStyleForGrid,
    "min-h-0",
    "h-fit w-full flex flex-col",
    "pt-1.5",
    "pl-1.5",
    "rounded-tr-sm",
    "rounded-b-sm",
    hasMultipulTabs ? "rounded-tl-none" : "rounded-tl-sm",
    colorDefinitions[themeColor][colorSettings.tabSelected].bg,
    "",
  )}
>
  <!-- function bar -->
  {@render PageWrapperContentFunctionBar?.()}
  <!-- content with scrollbar -->
  <div
    class={classNames("flex-auto min-h-0", "h-full w-full", scrollStyle, "")}
    use:focusableWhenScrolling={scrollAreaLabel}
  >
    <div class={classNames(gridMain, "w-full", "h-full", "")}>
      {@render PageWrapperContentBody?.()}
    </div>
  </div>
  <!-- footer -->
  {@render PageWrapperContentFooter?.()}
</div>
