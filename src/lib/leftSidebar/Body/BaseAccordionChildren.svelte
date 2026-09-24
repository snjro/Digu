<script lang="ts">
  import classNames from "classnames";
  import type { Snippet } from "svelte";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";

  interface Props {
    showVerticalLine: boolean;
    isOpenAccordion: boolean;
    baseAccordionChildren?: Snippet;
  }

  let { showVerticalLine, isOpenAccordion, baseAccordionChildren }: Props =
    $props();
  let leftPadding: `pl-${0 | 3}` = $derived(showVerticalLine ? "pl-0" : "pl-3");
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
    {@render baseAccordionChildren?.()}
  </div>
</div>
