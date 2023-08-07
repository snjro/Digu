<script lang="ts">
  import classNames from "classnames";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";

  export let showVerticalLine: boolean;
  export let isOpenAccordion: boolean;
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "w-full",
    "h-fit",
    !isOpenAccordion && "hidden"
  )}
>
  {#if showVerticalLine}
    <BaseItemIndicator
      isSelected={false}
      isHover={false}
      isUpdated={false}
      invisible={false}
      isTopLevelItem={false}
    />
  {/if}
  <div class={classNames("flex", "flex-col", "w-full", "")}>
    <slot name="baseAccordionChildren" />
  </div>
</div>
