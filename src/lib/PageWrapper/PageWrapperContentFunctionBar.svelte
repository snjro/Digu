<script lang="ts" module>
  export type PageWrapperContentFunctionBarDefinition = {
    buttonsDefinition: PageWrapperContentFunctionBarButtonsDefinition;
    showThreeDotsButton: boolean;
    buttonSize: BaseSize;
    breakPointWidthForOpendSidebar: BreakPointWidthValue;
    horizontalAlignment: "start" | "between" | "end";
  };
</script>

<script lang="ts">
  import type { PageWrapperContentFunctionBarButtonsDefinition } from "$lib/PageWrapper//PageWrapperContentFunctionBarButtons.svelte";
  import PageWrapperContentFunctionBarButtons from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import type { BreakPointWidthValue } from "$lib/appearanceConfig/size/sizeDefinitions";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { Snippet } from "svelte";

  interface Props {
    functionBarDefinition: PageWrapperContentFunctionBarDefinition;
    children?: Snippet;
  }

  let { functionBarDefinition, children }: Props = $props();

  const horizontalAlignment: () =>
    "justify-start" | "justify-between" | "justify-end" = () => {
    switch (functionBarDefinition.horizontalAlignment) {
      case "start":
        return "justify-start";
      case "between":
        return "justify-between";

      default:
        return "justify-end";
    }
  };
</script>

<div
  class={classNames(
    "flex-initial",
    "w-full",
    "flex",
    "flex-row",
    "items-center",
    horizontalAlignment(),
    "space-x-3",
    "pb-1.5",
    "pr-3",
  )}
>
  {@render children?.()}
  <PageWrapperContentFunctionBarButtons {functionBarDefinition} />
</div>
