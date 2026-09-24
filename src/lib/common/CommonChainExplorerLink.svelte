<script lang="ts">
  import BaseA from "$lib/base/BaseA.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { numberWithCommas } from "@utils/utilsCommon";

  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";
  import CommonCopyButton from "./CommonCopyButton.svelte";
  import type { CommonChainExplorerLinkProps } from "./chainExplorerLink";

  interface Props {
    subdirectory: CommonChainExplorerLinkProps["subdirectory"];
    // export let chainExplorerUrl: string;
    value: CommonChainExplorerLinkProps["value"];
    textSize?: CommonChainExplorerLinkProps["textSize"];
    forcedClass?: CommonChainExplorerLinkProps["forcedClass"];
    appendClass?: CommonChainExplorerLinkProps["appendClass"];
    withIcon?: CommonChainExplorerLinkProps["withIcon"];
    showCopyButton?: CommonChainExplorerLinkProps["showCopyButton"];
    isFontMono?: CommonChainExplorerLinkProps["isFontMono"];
    justifyEnd?: CommonChainExplorerLinkProps["justifyEnd"];
  }

  let {
    subdirectory,
    value,
    textSize = "md",
    forcedClass = undefined,
    appendClass: appendClassProp = undefined,
    withIcon = true,
    showCopyButton = true,
    isFontMono = false,
    justifyEnd = false,
  }: Props = $props();

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

  let appendClass = $derived(classNames(appendClassProp, "tabular-nums"));
  let targetChain = $derived(
    getTargetChain({
      chainName: $storeUserSettings.selectedChainName.toString(),
    }),
  );
  let chainExplorerUrl = $derived(
    targetChain.chainExplorers[
      $storeRpcSettings[targetChain.name].chainExplorerIndex
    ].url,
  );
  const href = () => {
    return `${chainExplorerUrl}/${subdirectory}/${value}`;
  };
  const linkText = () => {
    if (value && subdirectory === "block") {
      return numberWithCommas(parseInt(value));
    } else {
      return value;
    }
  };
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
    "",
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
