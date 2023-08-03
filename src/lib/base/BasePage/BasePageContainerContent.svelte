<script lang="ts" context="module">
  export const TAB_VALUES_COMMON = ["Overview", "ABI"] as const;
  export const TAB_VALUES_CONTRACT = TAB_VALUES_COMMON;
  export const TAB_VALUES_FUNCTION = TAB_VALUES_COMMON;
  export const TAB_VALUES_EVENT = [
    ...TAB_VALUES_COMMON,
    "Event Logs (text)",
    "Event Logs (hex)",
  ] as const;

  export type SelectedTabValueFunction = (typeof TAB_VALUES_FUNCTION)[number];
  export type SelectedTabValueEvent = (typeof TAB_VALUES_EVENT)[number];
  export type SelectedTabValueContract = (typeof TAB_VALUES_CONTRACT)[number];
</script>

<script
  lang="ts"
  generics="TabValues, SelectedTabValue extends SelectedTabValueContract | SelectedTabValueEvent | SelectedTabValueFunction"
>
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { EventLogType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/EventLogs.svelte";
  import { breakPointWidths, type BreakPointWidthKey } from "@utils/utilsDom";
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

  export let tabValues: TabValues | undefined;
  export let selectedTabValue: SelectedTabValue | undefined;
  export let tabGroupName: string | undefined;

  const size: BaseSize = sizeSettings.tab;

  type ConvertTabValueForLabelText =
    | "Overv"
    | "ABI"
    | `EL (${EventLogType})`
    | SelectedTabValue;
  $: convertTabValueForLabelText = (
    tabValue: SelectedTabValue
  ): ConvertTabValueForLabelText => {
    let convertedTabValue: ConvertTabValueForLabelText = tabValue;
    const breakPointWidthKey: BreakPointWidthKey =
      $storeUserSettings.isOpenSidebar ? "md" : "sm";
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
  function convertTabValueForHref(tabValue: SelectedTabValue): `#${string}` {
    let convertedTabValue: string;
    convertedTabValue = convertToKebabCase(tabValue as string);
    convertedTabValue = convertedTabValue.replace("(", "").replace(")", "");
    return `#${convertedTabValue}`;
  }
  $: labelAndValues = (): RadioLabelAndValues<SelectedTabValue> =>
    Array.isArray(tabValues)
      ? tabValues.map((tabValue: SelectedTabValue) => {
          return {
            labelText: convertTabValueForLabelText(tabValue) as string,
            value: tabValue,
            inputId: `${tabGroupName}${tabValue}`,
            href: convertTabValueForHref(tabValue),
          };
        })
      : [];
  $: {
    if (tabValues && selectedTabValue) {
      const selectedTabValueByUrl: SelectedTabValue | undefined =
        labelAndValues().find((labelAndValue) => {
          return labelAndValue.href === $page.url.hash;
        })?.value;
      if (selectedTabValue === selectedTabValueByUrl) {
        // There is nothing to do.
        // Because a selected tab and a URL hash match.
      } else {
        if (selectedTabValueByUrl) {
          // Match URL hash and selectedTabValue.
          // considering the case where the page is accessed by typing the URL directly,
          // URL hash is used here,
          selectedTabValue = selectedTabValueByUrl;
        } else {
          // Add hash to URL.
          // Because a tab is selected but that is not reflected in URL.
          goto(
            `${$page.url.pathname}${convertTabValueForHref(selectedTabValue)}`
          );
        }
      }
    }
  }
</script>

<div class={classNames("w-full", "h-full", "flex", "flex-col")}>
  {#if tabValues && tabGroupName}
    <BaseRadio
      radioButtonType="tab"
      border={true}
      groupName={tabGroupName}
      bind:selectedValue={selectedTabValue}
      {size}
      labelAndValues={labelAndValues()}
    />
  {/if}
  <BasePageContainerContentFrame hasTab={tabValues ? true : false}>
    <slot />
  </BasePageContainerContentFrame>
</div>
