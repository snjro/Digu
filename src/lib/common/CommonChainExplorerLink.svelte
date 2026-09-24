<script lang="ts">
  import { page } from "$app/state";
  import BaseA from "$lib/base/BaseA.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";

  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import CommonCopyButton from "./CommonCopyButton.svelte";
  import { getPageChainName } from "./pageChainName";
  import {
    getChainExplorerHref,
    getChainExplorerLinkText,
    getChainExplorerUrl,
    type CommonChainExplorerLinkProps,
  } from "./chainExplorerLink";

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
  let chainExplorerUrl = $derived(
    getChainExplorerUrl(
      getPageChainName(
        page.params.chainName,
        $storeUserSettings.selectedChainName.toString(),
      ),
      $storeRpcSettings,
    ),
  );
  const href = () => {
    return getChainExplorerHref(chainExplorerUrl, subdirectory, value);
  };
  const linkText = () => {
    return getChainExplorerLinkText(subdirectory, value);
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
