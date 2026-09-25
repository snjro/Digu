<script lang="ts">
  import { base } from "$app/paths";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import { getContractHrefFromBase } from "$lib/common/linkHref";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonOpenLink from "$lib/common/CommonOpenLink.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import { NO_DATA } from "@utils/utilsCostants";
  import type { Snippet } from "svelte";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
    activateLinkOfContractName?: boolean;
    children?: Snippet;
  }

  let {
    targetChain,
    targetProject,
    targetVersion,
    targetContract,
    activateLinkOfContractName = false,
    children,
  }: Props = $props();

  const textSize: BaseSize = sizeSettings.itemMember;

  let hrefToContractName: string = $derived(
    getContractHrefFromBase(
      base,
      targetChain.name,
      targetProject.name,
      targetVersion.name,
      targetContract.name,
    ),
  );
</script>

<CommonItemMember text="Contract Name">
  {#if activateLinkOfContractName}
    <BaseA
      text={targetContract.name}
      {textSize}
      href={hrefToContractName}
      prefixIcon={{ name: "scriptText" }}
      openNewTab={false}
    />
  {:else}
    <BaseLabel text={targetContract.name} {textSize} />
  {/if}
</CommonItemMember>
<CommonItemMember text="Address">
  <CommonChainExplorerLink
    subdirectory="address"
    value={targetContract.address}
    {textSize}
  />
</CommonItemMember>
<CommonItemMember text="Source">
  {#if targetContract.sourceCodeUrl}
    <CommonOpenLink
      href={targetContract.sourceCodeUrl}
      text={targetContract.sourceCodeUrl}
      {textSize}
    />
  {:else}
    <BaseLabel text={NO_DATA} {textSize} />
  {/if}
</CommonItemMember>
{@render children?.()}
