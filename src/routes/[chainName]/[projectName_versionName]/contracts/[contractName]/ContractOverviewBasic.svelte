<script lang="ts">
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonOpenLink from "$lib/common/CommonOpenLink.svelte";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import { NO_DATA } from "@utils/utilsCostants";
  import { getProjectVersionNameForUrl } from "../../projectVersionNameHelper";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseSize } from "$lib/base/baseSizes";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let activateLinkOfContractName: boolean = false;

  const textSize: BaseSize = sizeSettings.itemMember;

  let hrefToContractName: string;
  $: hrefToContractName =
    `/${targetChain.name}` +
    `/${getProjectVersionNameForUrl(
      targetProject.name,
      targetVersion.name
    )}/contracts/${targetContract.name}`;
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
  <CommonOpenLink
    href={targetContract.sourceCodeUrl}
    text={targetContract.sourceCodeUrl ?? NO_DATA}
    {textSize}
  />
</CommonItemMember>
<slot />
