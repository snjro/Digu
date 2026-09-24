<script lang="ts" module>
  export type PageWrapperContentFooterDefinition = {
    buttonsDefinition: PageWrapperContentFooterButtonsDefinition;
    buttonSize: BaseSize;
    horizontalAlignment: "start" | "between" | "end";
  };
</script>

<script lang="ts">
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { Snippet } from "svelte";
  import type { PageWrapperContentFooterButtonsDefinition } from "./PageWrapperContentFooterButtons.svelte";
  import PageWrapperContentFooterButtons from "./PageWrapperContentFooterButtons.svelte";

  interface Props {
    footerDefinition: PageWrapperContentFooterDefinition;
    children?: Snippet;
  }

  let { footerDefinition, children }: Props = $props();

  const horizontalAlignment: () =>
    "justify-start" | "justify-between" | "justify-end" = () => {
    switch (footerDefinition.horizontalAlignment) {
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
    "px-3",
  )}
>
  {@render children?.()}
  <PageWrapperContentFooterButtons {footerDefinition} />
</div>
