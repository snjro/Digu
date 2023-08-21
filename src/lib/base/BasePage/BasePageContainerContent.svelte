<script lang="ts" context="module">
  export const TAB_VALUES_COMMON = ["Overview", "ABI"] as const;
  export const TAB_VALUES_CONTRACT = TAB_VALUES_COMMON;
  export const TAB_VALUES_EVENT = [
    ...TAB_VALUES_COMMON,
    "Event Logs (text)",
    "Event Logs (hex)",
  ] as const;
  export const TAB_VALUES_FUNCTION = TAB_VALUES_COMMON;

  export type TabStateContract = {
    selected: (typeof TAB_VALUES_CONTRACT)[number];
    values: typeof TAB_VALUES_CONTRACT;
    groupName: "tabGroupContract";
  };
  export type TabStateEvent = {
    selected: (typeof TAB_VALUES_EVENT)[number];
    values: typeof TAB_VALUES_EVENT;
    groupName: "tabGroupEvent";
  };
  export type TabStateFunction = {
    selected: (typeof TAB_VALUES_FUNCTION)[number];
    values: typeof TAB_VALUES_FUNCTION;
    groupName: "tabGroupFunction";
  };

  export function convertTabValueForHref<
    TabState extends TabStateContract | TabStateEvent | TabStateFunction
  >(tabValue: TabState["selected"]): `#${string}` {
    let convertedTabValue: string = convertToKebabCase(tabValue as string);
    convertedTabValue = convertedTabValue.replace("(", "").replace(")", "");
    return `#${convertedTabValue}`;
  }
</script>

<script
  lang="ts"
  generics=" TabState extends  TabStateContract|TabStateEvent|TabStateFunction"
>
  import {
    breakPointWidths,
    type BreakPointWidthKey,
  } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { EventLogType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/EventLogs.svelte";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import BasePageContainerContentFrame from "$lib/base/BasePage/BasePageContainerContentFrame.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import BaseRadio, {
    type RadioLabelAndValues,
  } from "$lib/base/BaseRadio.svelte";
  import { convertToKebabCase } from "@utils/utilsCommon";

  export let tabState: TabState | undefined;

  const size: BaseSize = sizeSettings.tab;

  let breakPointWidthKey: BreakPointWidthKey;
  $: breakPointWidthKey = $storeUserSettings.isOpenSidebar ? "md" : "sm";

  type ConvertTabValueForLabelText =
    | "Overv"
    | "ABI"
    | `EL (${EventLogType})`
    | TabState["selected"];
  $: convertTabValueForLabelText = (tabValue: TabState["selected"]): string => {
    let convertedTabValue: ConvertTabValueForLabelText = tabValue;
    if ($storeNoDbCurrentWidth <= breakPointWidths[breakPointWidthKey]) {
      switch (tabValue) {
        case "Overview":
          convertedTabValue = "Overv";
          break;
        case "ABI":
          convertedTabValue = "ABI";
          break;
        case "Event Logs (text)":
          convertedTabValue = "EL (text)";
          break;
        case "Event Logs (hex)":
          convertedTabValue = "EL (hex)";
          break;
      }
    }
    return convertedTabValue;
  };
  $: labelAndValues = (): RadioLabelAndValues<TabState["selected"]> =>
    tabState
      ? tabState.values.map((tabValue: TabState["selected"]) => {
          return {
            labelText: convertTabValueForLabelText(tabValue),
            value: tabValue,
            inputId: `${tabState!.groupName}_${tabValue}`,
            href: convertTabValueForHref(tabValue),
          };
        })
      : [];
  $: {
    if (tabState) {
      const selectedTabValueFoundByUrl: TabState["selected"] | undefined =
        tabState.values.find((tabValue: TabState["selected"]) => {
          const href: string = convertTabValueForHref(tabValue);
          return href === $page.url.hash;
        });
      if (tabState.selected === selectedTabValueFoundByUrl) {
        // There is nothing to do.
        // Because a selected tab and a URL hash matched.
      } else {
        if (selectedTabValueFoundByUrl) {
          // Need to match URL hash and selectedTabValue.
          // considering the case where the page is accessed by typing the URL directly,
          // URL hash is used as selected value here.
          tabState.selected = selectedTabValueFoundByUrl;
        } else {
          // Add hash to URL.
          // Because a tab is selected but that is not reflected in URL.
          goto(
            `${$page.url.pathname}${convertTabValueForHref(tabState.selected)}`
          );
        }
      }
    }
  }
</script>

<div class={classNames("min-h-0", "w-full", "h-full", "flex", "flex-col")}>
  {#if tabState}
    <BaseRadio
      radioButtonType="tab"
      border={true}
      groupName={tabState.groupName}
      bind:selectedValue={tabState.selected}
      {size}
      labelAndValues={labelAndValues()}
    />
  {/if}
  <BasePageContainerContentFrame hasTab={tabState ? true : false}>
    <slot />
  </BasePageContainerContentFrame>
</div>
