<script lang="ts">
  import classNames from "classnames";
  import BasePageContainerTitle from "$lib/base/BasePage/BasePageContainerTitle.svelte";
  import BasePageContainerContent from "./BasePageContainerContent.svelte";

  export let titleText: string;
  export let titleCategoryLabelText: string;

  type TabValue = $$Generic;
  export let selectedTabValue: TabValue | undefined = undefined;
  export let tabValues: TabValue[] | undefined = undefined;
  export let tabGroupName: string | undefined = undefined;
</script>

<div
  class={classNames(
    "space-y-3",
    // "overflow-y-auto",
    "h-fit",
    "w-full",
    ""
  )}
>
  <BasePageContainerTitle
    {titleText}
    {titleCategoryLabelText}
    isVerticalTitle={false}
  />
  <BasePageContainerContent bind:selectedTabValue {tabValues} {tabGroupName}>
    <slot />
  </BasePageContainerContent>
</div>
