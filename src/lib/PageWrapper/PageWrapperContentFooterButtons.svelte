<script lang="ts" context="module">
  export type PageWrapperContentFooterButtonsDefinition =
    SimplifiedButtonDefinition[];
</script>

<script lang="ts">
  import BaseButtonIcon, {
    type SimplifiedButtonDefinition,
  } from "$lib/base/BaseButtonIcon.svelte";
  import { buttonHeight } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { PageWrapperContentFooterDefinition } from "./PageWrapperContentFooter.svelte";

  export let footerDefinition: PageWrapperContentFooterDefinition;
</script>

<div
  class={classNames(
    "h-fit w-fit",
    "flex",
    "flex-row",
    "items-center",
    "space-x-3",
    "",
  )}
>
  <div class={classNames("flex", "flex-row", "items-center", "space-x-3", "")}>
    {#each footerDefinition.buttonsDefinition as { iconName, tooltipText, onClickEventFunction, tooltipXPosition, tooltipYPosition }}
      <BaseButtonIcon
        size={footerDefinition.buttonSize}
        label={tooltipText}
        {iconName}
        {tooltipText}
        {tooltipXPosition}
        {tooltipYPosition}
        colorCategoryBg={"interactive"}
        colorCategoryFront={"white"}
        appendClassButton={buttonHeight[footerDefinition.buttonSize]}
        on:click={onClickEventFunction}
      />
    {/each}
  </div>
</div>
