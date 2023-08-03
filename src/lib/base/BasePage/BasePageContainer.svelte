<script
  lang="ts"
  generics="TabValues, SelectedTabValue extends SelectedTabValueContract | SelectedTabValueEvent | SelectedTabValueFunction"
>
  import classNames from "classnames";
  import BasePageContainerTitle from "$lib/base/BasePage/BasePageContainerTitle.svelte";
  import BasePageContainerContent, {
    type SelectedTabValueContract,
    type SelectedTabValueEvent,
    type SelectedTabValueFunction,
  } from "./BasePageContainerContent.svelte";

  export let titleText: string;
  export let titleCategoryLabelText: string;

  export let tabValues: TabValues | undefined = undefined;
  export let selectedTabValue: SelectedTabValue | undefined = undefined;
  export let tabGroupName: string | undefined = undefined;
</script>

<div class={classNames("space-y-3", "h-fit", "w-full", "")}>
  <BasePageContainerTitle
    {titleText}
    {titleCategoryLabelText}
    isVerticalTitle={false}
  />
  <BasePageContainerContent bind:selectedTabValue {tabValues} {tabGroupName}>
    <slot />
  </BasePageContainerContent>
</div>
