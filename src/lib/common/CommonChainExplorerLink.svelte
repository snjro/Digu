<script lang="ts" context="module">
  export type CommonChainExplorerLinkProps = {
    subdirectory: keyof ChainExplorer["subdirectory"];
    value: string | undefined;
    textSize: NonNullable<BaseAProps["textSize"]>;
    forcedClass: BaseAProps["forcedClass"];
    appendClass: BaseAProps["appendClass"];
    withIcon: boolean;
    showCopyButton: boolean;
    isFontMono: boolean;
    justifyEnd: boolean;
  };
</script>

<script lang="ts">
  import type { ChainExplorer } from "@constants/chains/types";
  import BaseA, { type BaseAProps } from "$lib/base/BaseA.svelte";
  import { numberWithCommas } from "@utils/utilsCommon";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { storeRpcSettings } from "@stores/storeRpcSettings";

  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import CommonCopyButton from "./CommonCopyButton.svelte";

  export let subdirectory: CommonChainExplorerLinkProps["subdirectory"];
  // export let chainExplorerUrl: string;
  export let value: CommonChainExplorerLinkProps["value"];
  export let textSize: CommonChainExplorerLinkProps["textSize"] = "md";
  export let forcedClass: CommonChainExplorerLinkProps["forcedClass"] =
    undefined;
  export let appendClass: CommonChainExplorerLinkProps["appendClass"] =
    undefined;
  export let withIcon: CommonChainExplorerLinkProps["withIcon"] = true;
  export let showCopyButton: CommonChainExplorerLinkProps["showCopyButton"] =
    true;
  export let isFontMono: CommonChainExplorerLinkProps["isFontMono"] = false;
  export let justifyEnd: CommonChainExplorerLinkProps["justifyEnd"] = false;

  $: href = () => {
    return `${chainExplorerUrl}/${subdirectory}/${value}`;
  };
  $: linkText = () => {
    if (value && subdirectory === "block") {
      return numberWithCommas(parseInt(value));
    } else {
      return value;
    }
  };
  const suffixIcon = (): BaseIconProps | undefined => {
    if (withIcon) {
      // return { name: "linkVariant", size: textSize, appendClass: "ml-1" };
      return {
        name: "linkVariant",
        size: changeSize(textSize, -1),
      };
    } else {
      return undefined;
    }
  };
  $: targetChain = getTargetChain({
    chainName: $storeUserSettings.selectedChainName.toString(),
  });

  $: chainExplorerUrl =
    targetChain.chainExplorers[
      $storeRpcSettings[targetChain.name].chainExplorerIndex
    ].url;
  appendClass = classNames(appendClass, "tabular-nums");
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "space-x-1",
    "items-center",
    "w-full",
    "min-w-0",
    "max-w-full",

    justifyEnd ? "justify-end" : "justify-start",
    ""
  )}
>
  {#if value}
    <BaseA
      href={href()}
      text={linkText()}
      {textSize}
      suffixIcon={suffixIcon()}
      {isFontMono}
      {forcedClass}
      {appendClass}
    />
    {#if showCopyButton}
      <CommonCopyButton copyTarget={value} size={changeSize(textSize, -1)} />
    {/if}
  {:else}
    <BaseLabel text={value} {textSize} fontMono={isFontMono} />
  {/if}
</div>
