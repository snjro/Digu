<script lang="ts">
  import classNames from "classnames";
  import BasePageContainerTitle from "$lib/base/BasePage/BasePageContainerTitle.svelte";
  export let titleText: string;
  export let titleCategoryLabelText: string;
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
  <slot />
</div>
