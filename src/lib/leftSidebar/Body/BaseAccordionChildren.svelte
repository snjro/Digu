<script lang="ts">
  import classNames from "classnames";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";

  export let showVerticalLine: boolean;
  export let isOpenAccordion: boolean;
  let leftPadding: `pl-${0 | 3}` = showVerticalLine ? "pl-0" : "pl-3";
</script>

<div
  class={classNames(
    "flex-auto",
    "min-w-0",
    "flex",
    "flex-row",
    "h-fit",
    !isOpenAccordion && "hidden",
    "",
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
  <div
    class={classNames("flex-auto", "min-w-0", "flex", "flex-col", leftPadding)}
  >
    <slot name="baseAccordionChildren" />
  </div>
</div>
