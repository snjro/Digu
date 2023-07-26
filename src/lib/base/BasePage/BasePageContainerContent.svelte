<script lang="ts">
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

  type TabValue = $$Generic;
  export let selectedTabValue: TabValue | undefined;
  export let tabValues: TabValue[] | undefined;
  export let tabGroupName: string | undefined;

  const size: BaseSize = sizeSettings.tab;
  const labelAndValues: RadioLabelAndValues<TabValue> = tabValues
    ? tabValues.map((tabValue: TabValue) => {
        return {
          labelText: tabValue as string,
          value: tabValue,
          inputId: `${tabGroupName}${tabValue}`,
          href: `#${convertToKebabCase(tabValue as string)}`,
        };
      })
    : [];
  $: {
    if (tabValues) {
      const selectedTabValueByUrl = labelAndValues.find((labelAndValue) => {
        return labelAndValue.href === $page.url.hash;
      })?.value;
      if (selectedTabValue === $page.url.hash) {
        // There is nothing to do.
        // Because a selected tab and a URL hash match.
      } else {
        if (selectedTabValueByUrl) {
          // Match URL hash and selectedTabValue.
          // URL hash is preferred here, considering the case where the page is accessed by typing the URL directly.
          selectedTabValue = selectedTabValueByUrl;
        } else {
          // Add hash to URL.
          // Because a tab is selected but that is not reflected in URL.
          goto(
            `${$page.url}#${convertToKebabCase(selectedTabValue as string)}`
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
      {labelAndValues}
    />
  {/if}
  <BasePageContainerContentFrame hasTab={tabValues ? true : false}>
    <slot />
  </BasePageContainerContentFrame>
</div>
