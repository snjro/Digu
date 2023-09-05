<script lang="ts" context="module">
  export const TAB_VALUES_COMMON = ["Overview", "ABI"] as const;
  export const TAB_VALUES_CONTRACT = TAB_VALUES_COMMON;
  export const TAB_VALUES_EVENT = [
    ...TAB_VALUES_COMMON,
    "Event Logs (text)",
    "Event Logs (hex)",
  ] as const;
  export const TAB_VALUES_FUNCTION = TAB_VALUES_COMMON;

  export type TabsDefinitionContract = {
    selected: (typeof TAB_VALUES_CONTRACT)[number];
    values: typeof TAB_VALUES_CONTRACT;
    groupName: "tabGroupContract";
  };
  export type TabsDefinitionEvent = {
    selected: (typeof TAB_VALUES_EVENT)[number];
    values: typeof TAB_VALUES_EVENT;
    groupName: "tabGroupEvent";
  };
  export type TabsDefinitionFunction = {
    selected: (typeof TAB_VALUES_FUNCTION)[number];
    values: typeof TAB_VALUES_FUNCTION;
    groupName: "tabGroupFunction";
  };

  export function convertTabValueForHref<
    TabsDefinition extends
      | TabsDefinitionContract
      | TabsDefinitionEvent
      | TabsDefinitionFunction,
  >(tabValue: TabsDefinition["values"][number]): `#${string}` {
    let convertedTabValue: string = convertToKebabCase(tabValue as string);
    convertedTabValue = convertedTabValue.replace("(", "").replace(")", "");
    return `#${convertedTabValue}`;
  }
</script>

<script
  lang="ts"
  generics=" TabsDefinition extends  TabsDefinitionContract|TabsDefinitionEvent|TabsDefinitionFunction"
>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import PageWrapperTitle, {
    type PageWrapperTitleProps,
  } from "$lib/PageWrapper/PageWrapperTitle.svelte";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import {
    breakPointWidths,
    type BreakPointWidthKey,
  } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { zIndex } from "$lib/appearanceConfig/zIndex";
  import BaseRadio, {
    type RadioLabelAndValues,
  } from "$lib/base/BaseRadio.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import type { EventLogType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/EventLogs.svelte";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import classNames from "classnames";

  export let titleProps: PageWrapperTitleProps | undefined = undefined;
  export let tabsDefinition: TabsDefinition | undefined = undefined;
  export let isFullScreen: boolean = false;
  let breakPointWidthKey: BreakPointWidthKey;
  $: breakPointWidthKey = $storeUserSettings.isOpenSidebar ? "md" : "sm";

  type ConvertContentNameForLabelText =
    | "Overv"
    | "ABI"
    | `EL (${EventLogType})`
    | TabsDefinition["values"][number];

  $: convertTabValueForLabelText = (
    targetTabValue: TabsDefinition["values"][number],
  ): ConvertContentNameForLabelText => {
    if ($storeNoDbCurrentWidth <= breakPointWidths[breakPointWidthKey]) {
      switch (targetTabValue) {
        case "Overview":
          return "Overv";
        case "ABI":
          return "ABI";
        case "Event Logs (text)":
          return "EL (text)";
        case "Event Logs (hex)":
          return "EL (hex)";
        default:
          return targetTabValue;
      }
    } else {
      return targetTabValue;
    }
  };
  $: radioLabelAndValues = (): RadioLabelAndValues<
    TabsDefinition["values"][number]
  > =>
    tabsDefinition
      ? tabsDefinition.values.map(
          (targetTabValue: TabsDefinition["values"][number]) => {
            return {
              labelText: convertTabValueForLabelText(targetTabValue),
              value: targetTabValue,
              inputId: `${tabsDefinition!.groupName}_${targetTabValue}`,
              href: convertTabValueForHref(targetTabValue),
            };
          },
        )
      : [
          {
            labelText: "",
            value: "Overview",
            inputId: "",
            href: "",
          },
        ];

  const hasMultipulTabs = tabsDefinition
    ? tabsDefinition.values.length > 1
    : false;

  $: {
    if (hasMultipulTabs && tabsDefinition) {
      const selectedTabValueFoundByUrl:
        | TabsDefinition["values"][number]
        | undefined = tabsDefinition.values.find(
        (targetTabValue: TabsDefinition["values"][number]) => {
          const href: string = convertTabValueForHref(targetTabValue);
          return href === $page.url.hash;
        },
      );
      if (tabsDefinition.selected === selectedTabValueFoundByUrl) {
        // There is nothing to do.
        // Because a selected tab and a URL hash matched.
      } else {
        if (selectedTabValueFoundByUrl) {
          // Need to match URL hash and selectedTabValue.
          // considering the case where the page is accessed by typing the URL directly,
          // URL hash is used as selected value here.
          tabsDefinition.selected = selectedTabValueFoundByUrl;
        } else {
          // Add hash to URL.
          // Because a tab is selected but that is not reflected in URL.
          goto(
            `${$page.url.pathname}${convertTabValueForHref(
              tabsDefinition.selected,
            )}`,
          );
        }
      }
    }
  }
  function convertTabValueForHref(
    selectedTabName: TabsDefinition["selected"],
  ): `#${string}` {
    let convertedTabValue: string = convertToKebabCase(
      selectedTabName as string,
    );
    convertedTabValue = convertedTabValue.replace("(", "").replace(")", "");
    return `#${convertedTabValue}`;
  }

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (isFullScreen && event.key == "Escape") {
      isFullScreen = false;
    }
  });
</script>

<div
  class={classNames(
    isFullScreen
      ? classNames(
          "w-screen",
          "h-screen",
          "absolute",
          "inset-0",
          "pl-1.5",
          "pb-1.5",
          colorDefinitions[themeColor][colorSettings.tabSelected].bg,
          zIndex.fullScreen,
        )
      : classNames("flex-auto min-h-0", "h-full w-full"),
    "flex flex-col",
  )}
>
  {#if titleProps}
    <PageWrapperTitle
      titleText={titleProps.titleText}
      titleCategoryLabelText={titleProps.titleCategoryLabelText}
      {isFullScreen}
    />
  {/if}
  <div
    class={classNames(
      "flex-auto min-h-0",
      "h-full w-full flex flex-col",
      "",
      //  ""
    )}
  >
    {#if hasMultipulTabs && !isFullScreen && tabsDefinition}
      <BaseRadio
        radioButtonType="tab"
        border={true}
        groupName={tabsDefinition.groupName}
        bind:selectedValue={tabsDefinition.selected}
        size={sizeSettings.tab}
        labelAndValues={radioLabelAndValues()}
      />
    {/if}
    <slot name="PageWrapperContent" />
  </div>
</div>
