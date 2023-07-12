<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseSize } from "./baseSizes";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BaseRadio, { type RadioLabelAndValues } from "./BaseRadio.svelte";

  type TabValue = $$Generic;
  export let selectedTab: TabValue;
  export let tabValues: TabValue[] | undefined = undefined;
  export let groupName: string;

  const size: BaseSize = sizeSettings.tab;
  const labelAndValues: RadioLabelAndValues<TabValue> | undefined =
    tabValues &&
    tabValues.map((tabValue: TabValue) => {
      return {
        labelText: tabValue as string,
        value: tabValue,
        inputId: `${groupName}${tabValue}`,
      };
    });
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div class={classNames("w-full", "h-full")}>
  {#if labelAndValues}
    <BaseRadio
      radioButtonType="tab"
      border={true}
      {groupName}
      bind:selectedValue={selectedTab}
      {size}
      {labelAndValues}
    />
  {/if}
  <div
    class={classNames(
      "w-full",
      "h-full",
      "p-3",
      "rounded-tr",
      "rounded-b",
      !labelAndValues && "rounded-tl",
      colorDefinitions[themeColor][colorSettings.tabSelected].bg,
      // colorDefinitions[themeColor][colorSettings.tabSelected].shadow,
      // themeColor !== "dark" && "shadow-sm",
      ""
    )}
  >
    <slot />
  </div>
</div>
