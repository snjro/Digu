<script lang="ts">
  import BasePageContainerContentFrame from "$lib/base/BasePage/BasePageContainerContentFrame.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import BaseRadio, {
    type RadioLabelAndValues,
  } from "$lib/base/BaseRadio.svelte";

  type TabValue = $$Generic;
  export let selectedTab: TabValue | undefined;
  export let tabValues: TabValue[] | undefined;
  export let tabGroupName: string | undefined;

  const size: BaseSize = sizeSettings.tab;
  const labelAndValues: RadioLabelAndValues<TabValue> = tabValues
    ? tabValues.map((tabValue: TabValue) => {
        return {
          labelText: tabValue as string,
          value: tabValue,
          inputId: `${tabGroupName}${tabValue}`,
        };
      })
    : [];
</script>

<div class={classNames("w-full", "h-full", "flex", "flex-col")}>
  {#if tabValues && tabGroupName}
    <BaseRadio
      radioButtonType="tab"
      border={true}
      groupName={tabGroupName}
      bind:selectedValue={selectedTab}
      {size}
      {labelAndValues}
    />
  {/if}
  <BasePageContainerContentFrame hasTab={tabValues ? true : false}>
    <slot />
  </BasePageContainerContentFrame>
</div>
