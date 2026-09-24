<script lang="ts">
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import classNames from "classnames";
  import BaseLabel from "../BaseLabel.svelte";
  import type { BaseSize } from "../baseSizes";
  import { NO_DATA } from "@utils/utilsCostants";

  interface Props {
    title: "start" | "curr" | "current" | "goal";
    value: number;
    textSize: BaseSize;
  }

  let { title, value, textSize }: Props = $props();
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "justify-between",
    "space-x-3",
    "w-full",
    "",
  )}
>
  <div>
    <BaseLabel text={title} {textSize} />
  </div>
  <div class={classNames(value === 0 && "w-full flex justify-center")}>
    {#if value === 0}
      <BaseLabel {textSize} text={NO_DATA} />
    {:else}
      <CommonChainExplorerLink
        subdirectory="block"
        value={value.toString()}
        {textSize}
        showCopyButton={false}
      />
    {/if}
  </div>
</div>
