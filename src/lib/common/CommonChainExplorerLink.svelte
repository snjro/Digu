<script lang="ts">
  import { page } from "$app/state";
  import BaseA from "#lib/base/BaseA.svelte";
  import type { BaseIconProps } from "#lib/base/BaseIcon.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";

  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import { changeSize } from "#lib/base/baseSizes.js";
  import classNames from "classnames";
  import CommonCopyButton from "./CommonCopyButton.svelte";
  import { getPageChainName } from "./pageChainName";
  import {
    getChainExplorer,
    getChainExplorerHref,
    getChainExplorerLinkText,
    type CommonChainExplorerLinkProps,
  } from "./chainExplorerLink";

  interface Props {
    subdirectory: CommonChainExplorerLinkProps["subdirectory"];
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
      return {
        name: "linkVariant",
        size: changeSize(textSize, -1),
      };
    } else {
      return undefined;
    }
  };

  let appendClass = $derived(classNames(appendClassProp, "tabular-nums"));
  let chainExplorer = $derived(
    getChainExplorer(
      getPageChainName(
        page.params.chainName,
        $storeUserSettings.selectedChainName.toString(),
      ),
    ),
  );
  const href = () => {
    return getChainExplorerHref(chainExplorer, subdirectory, value);
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
