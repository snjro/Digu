<script
  lang="ts"
  generics=" TabsDefinition extends  TabsDefinitionContract|TabsDefinitionEvent|TabsDefinitionFunction"
>
  import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
  import { goto } from "$app/navigation";
  import { navigating, page } from "$app/state";
  import PageWrapperTitle, {
    type PageWrapperTitleProps,
  } from "#lib/PageWrapper/PageWrapperTitle.svelte";
  import {
    convertTabValueForHref,
    type TabsDefinitionContract,
    type TabsDefinitionEvent,
    type TabsDefinitionFunction,
  } from "#lib/PageWrapper/tabs.js";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import {
    breakPointWidths,
    type BreakPointWidthKey,
  } from "#lib/appearanceConfig/size/sizeDefinitions.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import { zIndex } from "#lib/appearanceConfig/zIndex.js";
  import BaseRadio, {
    type RadioLabelAndValues,
  } from "#lib/base/BaseRadio.svelte";
  import { storeNoDbCurrentWidth } from "#stores/storeNoDb.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import classNames from "classnames";
  import type { Snippet } from "svelte";

  interface Props {
    titleProps?: PageWrapperTitleProps | undefined;
    tabsDefinition?: TabsDefinition | undefined;
    isFullScreen?: boolean;
    PageWrapperContent?: Snippet;
  }

  let {
    titleProps = undefined,
    tabsDefinition = $bindable(undefined),
    isFullScreen = $bindable(false),
    PageWrapperContent,
  }: Props = $props();
  let breakPointWidthKey: BreakPointWidthKey = $derived(
    $storeUserSettings.isOpenSidebar ? "md" : "sm",
  );

  type ConvertContentNameForLabelText =
    "Overv" | "ABI" | "EL" | TabsDefinition["values"][number];

  const convertTabValueForLabelText = (
    targetTabValue: TabsDefinition["values"][number],
  ): ConvertContentNameForLabelText => {
    if ($storeNoDbCurrentWidth <= breakPointWidths[breakPointWidthKey]) {
      switch (targetTabValue) {
        case "Overview":
          return "Overv";
        case "ABI":
          return "ABI";
        case "Event Logs":
          return "EL";
        default:
          return targetTabValue;
      }
    } else {
      return targetTabValue;
    }
  };
  let radioLabelAndValues: RadioLabelAndValues<
    TabsDefinition["values"][number]
  > = $derived(
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
        ],
  );

  let hasMultipleTabs: boolean = $derived(
    tabsDefinition ? tabsDefinition.values.length > 1 : false,
  );

  $effect.pre(() => {
    if (hasMultipleTabs && tabsDefinition) {
      const selectedTabValueFoundByUrl:
        TabsDefinition["values"][number] | undefined =
        tabsDefinition.values.find(
          (targetTabValue: TabsDefinition["values"][number]) => {
            const href: string = convertTabValueForHref(targetTabValue);
            return href === page.url.hash;
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
        } else if (!navigating.type) {
          // Add hash to URL.
          // Because a tab is selected but that is not reflected in URL.
          // Wait until the current navigation ends, because goto aborts it.
          void goto(
            `${page.url.pathname}${convertTabValueForHref(
              tabsDefinition.selected,
            )}`,
            { replace: true },
          );
        }
      }
    }
  });

  // Escape closes only the top one. An open dialog or menu takes it first: a
  // popup or menu that is not a dialog sets data-open-menu while it is open.
  // Listen in the capture phase, so they are still open whatever the listener order is.
  // An ag-grid popup (e.g. a column filter) is neither, and ag-grid closes it
  // only when the focus is inside it.
  // A held key would close a dialog on the first keydown and the full screen
  // on a repeat, and Escape in an IME cancels the composition.
  const onKeydown = (event: KeyboardEvent): void => {
    if (
      isFullScreen &&
      event.key == "Escape" &&
      !event.repeat &&
      !event.isComposing &&
      !document.querySelector("dialog[open], [data-open-menu]") &&
      !(event.target instanceof Element && event.target.closest(".ag-popup"))
    ) {
      isFullScreen = false;
    }
  };
</script>

<svelte:document onkeydowncapture={onKeydown} />

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
          colorClasses[colorSettings.tabSelected].bg,
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
    {#if hasMultipleTabs && !isFullScreen && tabsDefinition}
      <BaseRadio
        radioButtonType="tab"
        border={true}
        groupName={tabsDefinition.groupName}
        bind:selectedValue={tabsDefinition.selected}
        size={sizeSettings.tab}
        labelAndValues={radioLabelAndValues}
      />
    {/if}
    {@render PageWrapperContent?.()}
  </div>
</div>
