<script lang="ts">
  import { getFirstTabUrlHash } from "$lib/PageWrapper/tabs";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type { Contract } from "@constants/chains/types";
  import { getContractHref } from "$lib/common/linkHref";
  import BaseAccordion from "./BaseAccordion.svelte";
  import type { BaseAccordionHeaderSuffixIcon } from "./BaseAccordionHeaderSuffixIcons.svelte";
  import BaseItem from "./BaseItem.svelte";
  import ItemEventsFunctions from "./ItemEventsFunctions.svelte";

  interface Props {
    targetContract: Contract;
    targetContractsHref: string;
  }

  let { targetContract, targetContractsHref }: Props = $props();

  const size: BaseSize = sizeSettings.leftSidebarTree2nd;
  const sizes: {
    contractSelf: BaseSize;
    contractSuffixIcon: BaseSize;
  } = {
    contractSelf: changeSize(size, 0),
    contractSuffixIcon: changeSize(size, -1),
  };
  let targetContractHref: string = $derived(
    getContractHref(targetContractsHref, targetContract.name),
  );
  const urlHash: string = getFirstTabUrlHash("contracts");
  let hasEvents: boolean = $derived(
    targetContract.events.abiFragments.length > 0,
  );
  let hasFunctions: boolean = $derived(
    targetContract.functions.abiFragments.length > 0,
  );
  let hasChildren: boolean = $derived(hasEvents || hasFunctions);

  const suffixIcons = (): BaseAccordionHeaderSuffixIcon[] => {
    let icons: BaseAccordionHeaderSuffixIcon[] = [];
    if (hasEvents) {
      icons.push({
        name: "databaseOutline",
        size: sizes.contractSuffixIcon,
      });
    }
    if (hasFunctions) {
      icons.push({
        name: "function",
        size: sizes.contractSuffixIcon,
      });
    }
    return icons;
  };
</script>

{#if hasChildren}
  <BaseAccordion
    label={targetContract.name}
    iconName={undefined}
    hrefWithoutUrlHash={targetContractHref}
    {urlHash}
    size={sizes.contractSelf}
    suffixIcons={suffixIcons()}
  >
    {#snippet baseAccordionChildren()}
      <ItemEventsFunctions
        targetAbiFragments={targetContract.events.abiFragments}
        abiFragmentsType="events"
        {targetContractHref}
      />
      <ItemEventsFunctions
        targetAbiFragments={targetContract.functions.abiFragments}
        abiFragmentsType="functions"
        {targetContractHref}
      />
    {/snippet}
  </BaseAccordion>
{:else}
  <BaseItem
    label={targetContract.name}
    hrefWithoutUrlHash={targetContractHref}
    {urlHash}
    size={sizes.contractSelf}
    {hasChildren}
  />
{/if}
